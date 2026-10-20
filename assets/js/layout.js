document.addEventListener("DOMContentLoaded", async function() {
    if (window.ecomsAuthReady) {
        const authenticated = await window.ecomsAuthReady;

        if (!authenticated) {
            return;
        }
    }

    await loadDashboardContent();

    await loadPartial("navbar", "../partials/navbar.html");
    updateNavbarUserInfo();
    await loadPartial("sidebar", "../partials/sidebar.html");
    configureRoleSidebar();
    await loadPartial("footer", "../partials/footer.html");

    injectFooterThemeControls();

    initializeLayout();
    setActiveSidebar();
    setupResponsiveTables();
    setupPageNavigation();
    syncNavCartBadge();
});

function configureRoleSidebar() {
    const userRole = (localStorage.getItem("ecoms_user_role") || "user").toLowerCase();
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    if (userRole !== "admin") {
        // Standard user sidebar: ONLY Dashboard, Cart, Transactions
        sidebar.innerHTML = `
            <ul class="nav">
                <li class="nav-item">
                    <a class="nav-link" href="main.html?page=Dashboard">
                        <i class="ti-home menu-icon"></i>
                        <span class="menu-title">Dashboard</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="main.html?page=Cart">
                        <i class="ti-shopping-cart menu-icon"></i>
                        <span class="menu-title">Cart</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="main.html?page=Transactions">
                        <i class="ti-receipt menu-icon"></i>
                        <span class="menu-title">Transactions</span>
                    </a>
                </li>
            </ul>
        `;
    }
}

async function syncNavCartBadge() {
    const userRole = (localStorage.getItem("ecoms_user_role") || "user").toLowerCase();
    const navCartItem = document.getElementById("navCartItemWrapper");
    const navCartBadge = document.getElementById("navCartBadge");

    if (userRole === "admin") {
        if (navCartItem) navCartItem.style.display = "none";
        return;
    }

    if (navCartItem) navCartItem.style.display = "flex";

    try {
        const apiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
        const token = localStorage.getItem("ecoms_session_token");
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`http://${apiHost}:3000/api/shop/cart`, {
            method: "GET",
            credentials: "include",
            headers: headers
        });
        const data = await res.json();
        if (res.ok && data.success && data.cart) {
            const count = data.cart.totalItems || 0;
            if (navCartBadge) {
                navCartBadge.textContent = count;
                navCartBadge.style.display = count > 0 ? "inline-block" : "none";
            }
        }
    } catch (err) {
        console.error("Cart badge sync error:", err);
    }
}

function updateNavbarUserInfo() {
    const userRole = (localStorage.getItem("ecoms_user_role") || "user").toLowerCase();
    const username = localStorage.getItem("ecoms_username") || "User";
    const navBadge = document.getElementById("navRoleBadge");
    const navUser = document.getElementById("navUsernameDisplay");
    const welcomeHeading = document.getElementById("welcomeUserHeading");
    const welcomeRoleBadge = document.getElementById("welcomeRoleBadge");

    if (navBadge) {
        if (userRole === "admin") {
            navBadge.className = "badge bg-danger text-white py-2 px-3";
            navBadge.innerHTML = '<i class="ti-shield me-1"></i> ADMIN';
        } else {
            navBadge.className = "badge bg-primary text-white py-2 px-3";
            navBadge.innerHTML = '<i class="ti-user me-1"></i> USER';
        }
    }
    if (navUser) {
        navUser.textContent = username;
    }
    if (welcomeHeading) {
        welcomeHeading.textContent = `Welcome, ${username}!`;
    }
    if (welcomeRoleBadge) {
        if (userRole === "admin") {
            welcomeRoleBadge.className = "badge bg-danger text-white";
            welcomeRoleBadge.textContent = "ADMIN (Full Access)";
        } else {
            welcomeRoleBadge.className = "badge bg-primary text-white";
            welcomeRoleBadge.textContent = "STANDARD USER (Read/Limited)";
        }
    }

    // Role-Based UI adjustments:
    // If standard user, highlight that Users (RBAC) requires Admin
    const usersNavLink = document.querySelector('a[href="main.html?page=Users"]');
    if (usersNavLink && userRole !== "admin") {
        const span = usersNavLink.querySelector(".menu-title");
        if (span && !span.querySelector(".badge")) {
            span.innerHTML = 'Users <span class="badge bg-secondary text-white" style="font-size: 9px; margin-left: 4px;">Admin only</span>';
        }
    }
}
async function loadDashboardContent() {
    if (!document.body.hasAttribute("data-app-shell")) {
        return;
    }

    const userRole = (localStorage.getItem("ecoms_user_role") || "user").toLowerCase();

    const pages = {
        Dashboard: userRole === "admin" ? "index.html" : "UserDashboard.html",
        Cart: "Cart.html",
        Transactions: "Transactions.html",
        Customer: "Customer.html",
        Orders: "Orders.html",
        Product: "Product.html",
        Inventory: "Inventory.html",
        Users: "Users.html",
        Cancelled: "Cancelled.html",
        Pending: "Pending.html",
        Preparing: "Preparing.html",
        Shipped: "Shipped.html",
        Delivered: "Delivered.html",
        Reports: "Reports.html",
    };

    const params = new URLSearchParams(window.location.search);

    const requestedPage = params.get("page");

    const page = requestedPage || "Dashboard";

    const file = pages[page];

    const slot = document.getElementById("page-content-slot");

    // =====================================================
    // INVALID PAGE
    // =====================================================

    if (!file) {
        window.location.replace("main.html?page=Dashboard");

        return;
    }

    // =====================================================
    // LOAD INTERNAL CONTENT
    // =====================================================

    try {
        const response = await fetch(`../pages/${file}`);

        if (!response.ok) {
            throw new Error(`Failed to load ${file}`);
        }

        const html = await response.text();

        const pageDocument = new DOMParser().parseFromString(html, "text/html");

        const content = pageDocument.querySelector(".content-wrapper");

        slot.innerHTML = content ? content.innerHTML : pageDocument.body.innerHTML;

        pageDocument.querySelectorAll(".modal").forEach((modal) => {
            document.body.append(modal.cloneNode(true));
        });

        document.title = `${page} | ECOMS`;

        await loadPageScript(page, userRole);
    } catch (error) {
        console.error(error);

        slot.innerHTML = `
            <h4>Error</h4>
            <p>
                Unable to load this page.
                Please try again.
            </p>
        `;
    }
}

function loadPageScript(page, userRole) {
    const scripts = {
        Dashboard: userRole === "admin" ? "../../assets/js/dashboard.js" : "../../assets/services/user-dashboard.js",
        Cart: "../../assets/services/user-dashboard.js",
        Transactions: "../../assets/services/user-dashboard.js",
        Customer: "../../assets/js/data-table.js",
        Orders: "../../assets/js/data-table.js",
        Inventory: "../../assets/services/inventory.js",
        Users: "../../assets/services/users.js",
        Product: "../../assets/js/data-table.js",
        Reports: "../../assets/js/data-table.js",
        Pending: "../../assets/js/data-table.js",
        Preparing: "../../assets/js/data-table.js",
        Shipped: "../../assets/js/data-table.js",
        Delivered: "../../assets/js/data-table.js",
        Cancelled: "../../assets/js/data-table.js",
    };
    if (!scripts[page]) return Promise.resolve();
    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = scripts[page];
        script.onload = script.onerror = resolve;
        document.body.append(script);
    });
}

async function mountMainLayout() {
    const pageContent = document.getElementById("page-content");

    // Legacy pages already contain the shell. New pages may contain only a
    // <template id="page-content"> with their page-specific content.
    if (!(pageContent instanceof HTMLTemplateElement)) {
        return;
    }

    try {
        const response = await fetch("../layouts/main.html");

        if (!response.ok) {
            throw new Error(`Failed to load main layout: ${response.status}`);
        }

        const layoutDocument = new DOMParser().parseFromString(
            await response.text(),
            "text/html",
        );
        const layout = layoutDocument.getElementById("main-layout-template");

        if (!(layout instanceof HTMLTemplateElement)) {
            throw new Error("Main layout template was not found.");
        }

        document.body.replaceChildren(layout.content.cloneNode(true));
        document
            .getElementById("page-content-slot")
            .append(pageContent.content.cloneNode(true));
    } catch (error) {
        console.error("Unable to mount the main layout.", error);
        document.body.replaceChildren(pageContent.content.cloneNode(true));
    }
}

function setupLogout() {
    const logoutButton = document.querySelector('[data-action="logout"]');

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", async function(event) {
        event.preventDefault();

        try {
            logoutButton.style.pointerEvents = "none";
            logoutButton.style.opacity = "0.6";

            const apiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
            const token = localStorage.getItem("ecoms_session_token");
            const headers = { Accept: "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(`http://${apiHost}:3000/api/auth/logout`, {
                method: "POST",
                credentials: "include",
                headers: headers,
            });

            const result = await response.json();

            console.log("Logout response:", result);

            // Clear temporary OTP/login data
            sessionStorage.removeItem("otp_email");
            sessionStorage.removeItem("otp_user_id");
            sessionStorage.removeItem("otp_username");

            // Clear authentication flags & tokens
            localStorage.removeItem("ecoms_session_token");
            localStorage.removeItem("ecoms_user_role");
            localStorage.removeItem("ecoms_username");
            localStorage.removeItem("authenticated");
            localStorage.removeItem("emailVerified");
            localStorage.removeItem("otpEmail");
            localStorage.removeItem("otpPurpose");

            // Redirect to login (relative path)
            window.location.replace("../pages/login.html");
        } catch (error) {
            console.error("Logout error:", error);

            sessionStorage.removeItem("otp_email");
            sessionStorage.removeItem("otp_user_id");
            sessionStorage.removeItem("otp_username");

            localStorage.removeItem("ecoms_session_token");
            localStorage.removeItem("ecoms_user_role");
            localStorage.removeItem("ecoms_username");
            localStorage.removeItem("authenticated");
            localStorage.removeItem("emailVerified");
            localStorage.removeItem("otpEmail");
            localStorage.removeItem("otpPurpose");

            window.location.replace("../pages/login.html");
        }
    });
}

function setupPageNavigation() {
    document.querySelectorAll('a[href^="main.html?page="]').forEach((link) => {
        link.addEventListener("click", function() {
            const page = new URL(this.href).searchParams.get("page");
            if (page) {
                sessionStorage.setItem("allowed-dashboard-page", page);
            }
        });
    });
}

async function loadPartial(elementId, filePath) {
    const element = document.getElementById(elementId);

    if (!element) {
        console.error("Element not found:", elementId);
        return;
    }

    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            throw new Error(`Failed to load ${filePath}: ${response.status}`);
        }

        element.innerHTML = await response.text();
    } catch (error) {
        console.error(error);
    }
}

function setActiveSidebar() {
    // =====================================================
    // GET CURRENT PAGE FROM URL
    // =====================================================

    const params = new URLSearchParams(window.location.search);

    const requestedPage = params.get("page");

    // =====================================================
    // SIDEBAR LINKS
    // =====================================================

    const sidebarLinks = document.querySelectorAll("#sidebar .nav-link");

    // =====================================================
    // REMOVE PREVIOUS ACTIVE STATES
    // =====================================================

    sidebarLinks.forEach(function(link) {
        link.classList.remove("active");

        const navItem = link.closest(".nav-item");

        if (navItem) {
            navItem.classList.remove("active");
        }

        const collapse = link.closest(".collapse");

        if (collapse) {
            collapse.classList.remove("show");
        }
    });

    // =====================================================
    // FIND ACTIVE LINK
    // =====================================================

    sidebarLinks.forEach(function(link) {
        const href = link.getAttribute("href");

        if (!href) {
            return;
        }

        // -------------------------------------------------
        // Get ?page= value from sidebar link
        // -------------------------------------------------

        let linkPage = null;

        try {
            linkPage = new URL(href, window.location.href).searchParams.get("page");
        } catch (error) {
            console.warn("Invalid sidebar link:", href);
        }

        // -------------------------------------------------
        // Match current page
        // -------------------------------------------------

        if (requestedPage && linkPage === requestedPage) {
            link.classList.add("active");

            const navItem = link.closest(".nav-item");

            if (navItem) {
                navItem.classList.add("active");
            }

            // ---------------------------------------------
            // Delivery Status / submenu
            // ---------------------------------------------

            const submenu = link.closest(".sub-menu");

            if (submenu) {
                const collapse = submenu.closest(".collapse");

                if (collapse) {
                    collapse.classList.add("show");

                    const parentItem = collapse.closest(".nav-item");

                    if (parentItem) {
                        parentItem.classList.add("active");
                    }
                }
            }
        }
    });
}

function injectFooterThemeControls() {
    const themePanel = document.getElementById("theme-settings");
    const navbarSkins = document.getElementById("navbar-skins");
    const mainPanelSkins = document.getElementById("mainpanel-skins");

    if (!themePanel || document.getElementById("footer-skins")) {
        return;
    }

    const footerHeading = document.createElement("p");
    footerHeading.className = "settings-heading mt-2";
    footerHeading.textContent = "FOOTER SKINS";

    const footerTiles = document.createElement("div");
    footerTiles.className = "color-tiles mx-0 px-4";
    footerTiles.id = "footer-skins";
    footerTiles.innerHTML = `
        <div class="tiles selected" data-footer-skin="footer-white" style="background:#F5F7FF;border:1px solid #d6d6d6"></div>
        <div class="tiles" data-footer-skin="footer-black" style="background:#111111"></div>
        <div class="tiles" data-footer-skin="footer-brown" style="background:#B47245"></div>
    `;

    const anchor = mainPanelSkins || navbarSkins;

    if (!anchor || !anchor.parentNode) {
        return;
    }

    anchor.parentNode.insertBefore(footerHeading, anchor.nextSibling);
    anchor.parentNode.insertBefore(footerTiles, footerHeading.nextSibling);
}

function initializeLayout() {
    /*
     * SIDEBAR MINIMIZE
     */
    $(document)
        .off("click.sidebarMinimize")
        .on("click.sidebarMinimize", '[data-toggle="minimize"]', function() {
            const body = $("body");

            if (
                body.hasClass("sidebar-toggle-display") ||
                body.hasClass("sidebar-absolute")
            ) {
                body.toggleClass("sidebar-hidden");
            } else {
                body.toggleClass("sidebar-icon-only");
            }
        });

    /*
     * MOBILE SIDEBAR
     */
    $(document)
        .off("click.sidebarOffcanvas")
        .on("click.sidebarOffcanvas", '[data-toggle="offcanvas"]', function() {
            $(".sidebar-offcanvas").toggleClass("active");
        });

    /*
     * SEARCH
     */
    $(document)
        .off("click.navbarSearch")
        .on("click.navbarSearch", "#navbar-search-icon", function() {
            $("#navbar-search-input").focus();
        });
}

function setupResponsiveTables() {
    const tables = document.querySelectorAll(
        ".table-responsive table, .dataTables_wrapper table",
    );

    tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map(
            (header) => header.textContent.replace(/\s+/g, " ").trim(),
        );

        table.querySelectorAll("tbody tr").forEach((row) => {
            const cells = row.querySelectorAll("td");

            cells.forEach((cell, index) => {
                if (!cell.hasAttribute("data-label") && headers[index]) {
                    cell.setAttribute("data-label", headers[index]);
                }
            });
        });
    });
}

document.addEventListener("click", async function(event) {
    const logoutButton = event.target.closest('[data-action="logout"]');

    if (!logoutButton) {
        return;
    }

    event.preventDefault();

    try {
        const apiHost = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
        const token = localStorage.getItem("ecoms_session_token");
        const headers = { Accept: "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`http://${apiHost}:3000/api/auth/logout`, {
            method: "POST",
            credentials: "include",
            headers: headers,
        });

        const result = await response.json();
        console.log("LOGOUT RESPONSE:", result);

        localStorage.removeItem("ecoms_session_token");
        localStorage.removeItem("ecoms_user_role");
        localStorage.removeItem("ecoms_username");
        sessionStorage.clear();

        window.location.replace("../pages/login.html");
    } catch (error) {
        console.error("Logout request failed:", error);

        localStorage.removeItem("ecoms_session_token");
        localStorage.removeItem("ecoms_user_role");
        localStorage.removeItem("ecoms_username");
        sessionStorage.clear();

        window.location.replace("../pages/login.html");
    }
});

window.refreshResponsiveTables = setupResponsiveTables;