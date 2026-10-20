(function () {
    "use strict";

    const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
    const API_USERS_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.USERS_URL) ||
        ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/users` : "https://ecoms-api.onrender.com/api/users");
    const API_AUTH_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.AUTH_URL) ||
        ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/auth` : "https://ecoms-api.onrender.com/api/auth");

    function getAuthHeaders() {
        const token = localStorage.getItem("ecoms_session_token");
        return token ? { "Authorization": `Bearer ${token}` } : {};
    }

    let usersList = [];
    let currentUserRole = localStorage.getItem("ecoms_user_role") || "user";
    let currentUsername = localStorage.getItem("ecoms_username") || "";

    function initializeUsersDashboard() {
        const tableBody = document.getElementById("usersBody");
        const refreshBtn = document.getElementById("refreshUsersBtn");
        const saveRoleBtn = document.getElementById("saveRoleBtn");

        if (!tableBody) {
            setTimeout(initializeUsersDashboard, 100);
            return;
        }

        updateCurrentRoleDisplay();

        if (refreshBtn) {
            refreshBtn.addEventListener("click", loadUsers);
        }

        if (saveRoleBtn) {
            saveRoleBtn.addEventListener("click", handleRoleSave);
        }

        loadUsers();
    }

    function updateCurrentRoleDisplay() {
        const badge = document.getElementById("currentUserBadge");
        if (!badge) return;

        if (currentUserRole === "admin") {
            badge.className = "badge bg-danger text-white";
            badge.innerHTML = `<i class="ti-shield me-1"></i> You are: <strong>Administrator</strong>`;
        } else {
            badge.className = "badge bg-secondary text-white";
            badge.innerHTML = `<i class="ti-user me-1"></i> You are: <strong>Standard User</strong>`;
        }
    }

    async function loadUsers() {
        const tableBody = document.getElementById("usersBody");
        const deniedBanner = document.getElementById("accessDeniedBanner");
        const tableWrapper = document.getElementById("usersTableWrapper");

        if (!tableBody) return;

        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                    Loading users from secure endpoint...
                </td>
            </tr>
        `;

        try {
            const response = await fetch(API_USERS_URL, {
                method: "GET",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    ...getAuthHeaders(),
                },
            });

            const result = await response.json();

            // 403 Forbidden: Role-Based Access Control blocked the user
            if (response.status === 403) {
                if (deniedBanner) deniedBanner.classList.remove("d-none");
                if (tableWrapper) tableWrapper.classList.add("d-none");
                updateStats(0, 0, 0);
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to load users.");
            }

            if (deniedBanner) deniedBanner.classList.add("d-none");
            if (tableWrapper) tableWrapper.classList.remove("d-none");

            usersList = Array.isArray(result.data) ? result.data : [];

            renderStats(usersList);
            renderUsersTable(usersList);
        } catch (error) {
            console.error("Load users error:", error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger py-4">
                        <i class="ti-alert me-1"></i> ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    function updateStats(total, admins, regulars) {
        const totalEl = document.getElementById("statTotalUsers");
        const adminEl = document.getElementById("statAdminUsers");
        const regularEl = document.getElementById("statRegularUsers");

        if (totalEl) totalEl.textContent = total;
        if (adminEl) adminEl.textContent = admins;
        if (regularEl) regularEl.textContent = regulars;
    }

    function renderStats(users) {
        const total = users.length;
        const admins = users.filter((u) => u.role === "admin").length;
        const regulars = users.filter((u) => u.role !== "admin").length;
        updateStats(total, admins, regulars);
    }

    function renderUsersTable(users) {
        const tableBody = document.getElementById("usersBody");
        if (!tableBody) return;

        tableBody.replaceChildren();

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        No user records found.
                    </td>
                </tr>
            `;
            return;
        }

        users.forEach((user) => {
            const row = document.createElement("tr");

            // User ID
            const idCell = document.createElement("td");
            idCell.className = "fw-bold";
            idCell.textContent = `#${user.user_id}`;
            row.appendChild(idCell);

            // Username
            const userCell = document.createElement("td");
            userCell.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center me-2" style="width:32px; height:32px; font-weight: bold;">
                        ${(user.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>${user.username}</div>
                </div>
            `;
            row.appendChild(userCell);

            // Email
            const emailCell = document.createElement("td");
            emailCell.textContent = user.email || "N/A";
            row.appendChild(emailCell);

            // Role Badge
            const roleCell = document.createElement("td");
            const isAdm = user.role === "admin";
            roleCell.innerHTML = `
                <span class="badge ${isAdm ? "bg-danger" : "bg-primary"} text-white">
                    <i class="${isAdm ? "ti-shield" : "ti-user"} me-1"></i>${user.role ? user.role.toUpperCase() : "USER"}
                </span>
            `;
            row.appendChild(roleCell);

            // Created Date
            const createdCell = document.createElement("td");
            createdCell.textContent = formatDate(user.time_in);
            row.appendChild(createdCell);

            // Last Active
            const activeCell = document.createElement("td");
            activeCell.textContent = formatDate(user.time_out);
            row.appendChild(activeCell);

            // Actions (Change Role)
            const actionCell = document.createElement("td");
            actionCell.className = "text-center";

            const changeBtn = document.createElement("button");
            changeBtn.type = "button";
            changeBtn.className = "btn btn-sm btn-outline-dark";
            changeBtn.innerHTML = `<i class="ti-pencil-alt me-1"></i> Edit Role`;
            changeBtn.addEventListener("click", () => openRoleModal(user));

            actionCell.appendChild(changeBtn);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    function openRoleModal(user) {
        const modalEl = document.getElementById("roleModal");
        if (!modalEl || typeof bootstrap === "undefined") return;

        const targetName = document.getElementById("modalTargetUsername");
        const targetId = document.getElementById("modalTargetUserId");
        const roleAdminRadio = document.getElementById("roleAdmin");
        const roleUserRadio = document.getElementById("roleUser");
        const alertBox = document.getElementById("roleModalAlert");

        if (targetName) targetName.textContent = user.username;
        if (targetId) targetId.value = user.user_id;
        if (alertBox) alertBox.innerHTML = "";

        if (user.role === "admin") {
            roleAdminRadio.checked = true;
        } else {
            roleUserRadio.checked = true;
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }

    async function handleRoleSave() {
        const targetId = document.getElementById("modalTargetUserId")?.value;
        const selectedRole = document.querySelector('input[name="userRoleChoice"]:checked')?.value;
        const saveBtn = document.getElementById("saveRoleBtn");
        const alertBox = document.getElementById("roleModalAlert");
        const modalEl = document.getElementById("roleModal");

        if (!targetId || !selectedRole) return;

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Updating...";
        }

        try {
            const response = await fetch(`${API_USERS_URL}/${targetId}/role`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ role: selectedRole }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to update role.");
            }

            if (modalEl && typeof bootstrap !== "undefined") {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            await loadUsers();
        } catch (error) {
            console.error("Save role error:", error);
            if (alertBox) {
                alertBox.innerHTML = `
                    <div class="alert alert-danger mb-0 py-2" role="alert">
                        ${error.message}
                    </div>
                `;
            }
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Role";
            }
        }
    }

    function formatDate(value) {
        if (!value) return "N/A";
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Initialize once script executes
    initializeUsersDashboard();
})();
