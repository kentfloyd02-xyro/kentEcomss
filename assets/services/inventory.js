// const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
const API_URL = `http://${API_HOST}:3000/api/inventory`;

let inventory = [];
let editingId = null;
let deletingId = null;
let restoringId = null;
let isPermanentDelete = false;
let currentView = "active"; // "active" or "archived"
let currentProductImage = null;

// =========================================================
// INITIALIZE INVENTORY
// =========================================================

function initializeInventory() {
    const form = document.getElementById("itemForm");

    const tableBody = document.getElementById("inventoryBody");

    const itemModalElement = document.getElementById("itemModal");

    const deleteModalElement = document.getElementById("deleteItemModal");

    const viewModalElement = document.getElementById("viewItemModal");

    const restoreModalElement = document.getElementById("restoreItemModal");

    const addItemBtn = document.getElementById("addItemBtn");

    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    const confirmRestoreBtn = document.getElementById("confirmRestoreBtn");

    const btnViewActive = document.getElementById("btnViewActive");
    const btnViewArchived = document.getElementById("btnViewArchived");
    const activeCountBadge = document.getElementById("activeCountBadge");
    const archivedCountBadge = document.getElementById("archivedCountBadge");
    const archivedNotice = document.getElementById("archivedNotice");
    const thDateCol = document.getElementById("thDateCol");

    // -----------------------------------------------------
    // WAIT IF INVENTORY.HTML HAS NOT BEEN LOADED YET
    // -----------------------------------------------------

    if (!form ||
        !tableBody ||
        !itemModalElement ||
        !deleteModalElement ||
        !addItemBtn ||
        !confirmDeleteBtn
    ) {
        setTimeout(initializeInventory, 100);

        return;
    }

    const userRole = (localStorage.getItem("ecoms_user_role") || "user").toLowerCase();
    if (userRole !== "admin" && addItemBtn) {
        addItemBtn.classList.add("disabled");
        addItemBtn.title = "Admin role required to add inventory items";
        addItemBtn.style.opacity = "0.6";
        addItemBtn.style.cursor = "not-allowed";
        addItemBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert("Role-Based Access Control: Only administrators are authorized to add new products.");
        }, true);
    }

    // -----------------------------------------------------
    // BOOTSTRAP MODALS
    // -----------------------------------------------------

    if (typeof bootstrap === "undefined") {
        console.error("Bootstrap is not loaded.");

        return;
    }

    const itemModal = bootstrap.Modal.getOrCreateInstance(itemModalElement);

    const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);

    const viewModal = viewModalElement ?
        bootstrap.Modal.getOrCreateInstance(viewModalElement) :
        null;

    const restoreModal = restoreModalElement ?
        bootstrap.Modal.getOrCreateInstance(restoreModalElement) :
        null;

    // -----------------------------------------------------
    // FORM FIELDS
    // -----------------------------------------------------

    const sku = document.getElementById("itemSku");

    const productName = document.getElementById("itemProductName");

    const description = document.getElementById("itemDescription");

    const quantity = document.getElementById("itemQuantity");

    const price = document.getElementById("itemPrice");

    const image = document.getElementById("itemImage");
    const imageHint = document.getElementById("currentImageHint");

    // -----------------------------------------------------
    // MAKE SURE ALL FIELDS EXIST
    // -----------------------------------------------------

    if (!sku || !productName || !description || !quantity || !price || !image) {
        console.error("Inventory form fields are missing from Inventory.html.");

        return;
    }

    // =====================================================
    // API REQUEST
    // =====================================================

    async function apiRequest(url, options = {}) {
        const token = localStorage.getItem("ecoms_session_token");
        const response = await fetch(url, {
            ...options,

            credentials: "include",

            headers: {
                "Content-Type": "application/json",

                Accept: "application/json",

                ...(token ? { "Authorization": `Bearer ${token}` } : {}),

                ...(options.headers || {}),
            },
        });

        let result = null;

        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(result && result.message ? result.message : `Request failed (${response.status})`);
        }

        return result;
    }

    // =====================================================
    // TAB VIEW TOGGLE (ACTIVE vs ARCHIVED)
    // =====================================================

    if (btnViewActive && !btnViewActive.hasAttribute("data-bound")) {
        btnViewActive.setAttribute("data-bound", "true");
        btnViewActive.addEventListener("click", function() {
            if (currentView === "active") return;
            currentView = "active";
            btnViewActive.classList.add("btn-primary", "active");
            btnViewActive.classList.remove("btn-outline-primary");
            if (btnViewArchived) {
                btnViewArchived.classList.add("btn-outline-secondary");
                btnViewArchived.classList.remove("btn-secondary", "active");
            }
            if (archivedNotice) archivedNotice.classList.add("d-none");
            if (thDateCol) thDateCol.textContent = "Created";
            loadInventory();
        });
    }

    if (btnViewArchived && !btnViewArchived.hasAttribute("data-bound")) {
        btnViewArchived.setAttribute("data-bound", "true");
        btnViewArchived.addEventListener("click", function() {
            if (currentView === "archived") return;
            currentView = "archived";
            btnViewArchived.classList.add("btn-secondary", "active");
            btnViewArchived.classList.remove("btn-outline-secondary");
            if (btnViewActive) {
                btnViewActive.classList.add("btn-outline-primary");
                btnViewActive.classList.remove("btn-primary", "active");
            }
            if (archivedNotice) {
                archivedNotice.classList.remove("d-none");
                archivedNotice.classList.add("d-flex");
            }
            if (thDateCol) thDateCol.textContent = "Archived Date";
            loadInventory();
        });
    }

    // =====================================================
    // LOAD INVENTORY
    // =====================================================

    async function loadInventory() {
        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="text-center"
                >
                    Loading ${currentView === "archived" ? "archived" : "active"} inventory...
                </td>
            </tr>
        `;

        try {
            const isArchived = currentView === "archived";
            const result = await apiRequest(`${API_URL}?archived=${isArchived}`);

            if (Array.isArray(result)) {
                inventory = result;
            } else if (Array.isArray(result && result.data)) {
                inventory = result.data;
            } else {
                inventory = [];
            }

            if (result && typeof result.activeCount === "number" && activeCountBadge) {
                activeCountBadge.textContent = result.activeCount;
            }
            if (result && typeof result.archivedCount === "number" && archivedCountBadge) {
                archivedCountBadge.textContent = result.archivedCount;
            }

            renderInventory();
        } catch (error) {
            console.error("Load inventory error:", error);

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        class="text-center text-danger"
                    >
                        Failed to load inventory.
                    </td>
                </tr>
            `;
        }
    }

    // =====================================================
    // RENDER INVENTORY
    // =====================================================

    function renderInventory() {
        tableBody.replaceChildren();

        if (inventory.length === 0) {
            const row = document.createElement("tr");

            const cell = document.createElement("td");

            cell.colSpan = 9;

            cell.className = "text-center text-muted";

            cell.textContent = currentView === "archived" ? "No archived inventory records found." : "No active inventory records found.";

            row.appendChild(cell);

            tableBody.appendChild(row);

            return;
        }

        inventory.forEach((item) => {
            const row = document.createElement("tr");

            // -------------------------------------------------
            // ID
            // -------------------------------------------------

            addCell(row, item.inventory_id);

            // -------------------------------------------------
            // SKU
            // -------------------------------------------------

            addCell(row, item.sku);

            // -------------------------------------------------
            // PRODUCT
            // -------------------------------------------------

            addCell(row, item.product_name);

            // -------------------------------------------------
            // DESCRIPTION
            // -------------------------------------------------

            addCell(row, item.product_description);

            // -------------------------------------------------
            // STOCK
            // -------------------------------------------------

            addCell(row, item.product_quantity);

            // -------------------------------------------------
            // PRICE
            // -------------------------------------------------

            let formattedPrice = "N/A";

            if (item.product_price !== null && item.product_price !== undefined) {
                formattedPrice = `₱${Number(item.product_price).toFixed(2)}`;
            }

            addCell(row, formattedPrice);

            // -------------------------------------------------
            // IMAGE
            // -------------------------------------------------
            const imgCell = document.createElement("td");
            if (item.product_image && String(item.product_image).trim() !== "") {
                const imgPath = item.product_image.startsWith("http")
                    ? item.product_image
                    : `../../assets/images/clothing/${item.product_image}`;
                imgCell.innerHTML = `
                    <img src="${imgPath}" alt="${item.product_name || "item"}" 
                         style="width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #e0e0e0;" 
                         onerror="this.onerror=null; this.src='../../assets/images/clothing/c1_item.png';" />
                `;
            } else {
                imgCell.innerHTML = `<span class="badge bg-light text-muted border">No image</span>`;
            }
            row.appendChild(imgCell);

            // -------------------------------------------------
            // DATE (Created vs Archived)
            // -------------------------------------------------

            const displayDate = currentView === "archived" 
                ? (item.archived_at || item.created_at) 
                : item.created_at;
            addCell(row, formatDate(displayDate));

            // -------------------------------------------------
            // ACTIONS
            // -------------------------------------------------

            const actions = document.createElement("td");

            // VIEW BUTTON
            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "btn btn-sm btn-info me-1";
            viewButton.textContent = "View";
            viewButton.addEventListener("click", function() {
                viewItem(item.inventory_id);
            });
            actions.append(viewButton);

            if (userRole === "admin") {
                if (currentView === "archived") {
                    // RESTORE BUTTON
                    const restoreButton = document.createElement("button");
                    restoreButton.type = "button";
                    restoreButton.className = "btn btn-sm btn-success text-white me-1";
                    restoreButton.innerHTML = '<i class="ti-reload me-1"></i> Restore';
                    restoreButton.title = "Restore item to active inventory";
                    restoreButton.addEventListener("click", function() {
                        confirmRestore(item.inventory_id);
                    });

                    // PERMANENT DELETE BUTTON
                    const permDeleteButton = document.createElement("button");
                    permDeleteButton.type = "button";
                    permDeleteButton.className = "btn btn-sm btn-outline-danger";
                    permDeleteButton.innerHTML = '<i class="ti-trash me-1"></i> Delete';
                    permDeleteButton.title = "Delete permanently";
                    permDeleteButton.addEventListener("click", function() {
                        confirmDelete(item.inventory_id, true);
                    });

                    actions.append(restoreButton, permDeleteButton);
                } else {
                    // EDIT BUTTON
                    const editButton = document.createElement("button");
                    editButton.type = "button";
                    editButton.className = "btn btn-sm btn-primary me-1";
                    editButton.textContent = "Edit";
                    editButton.addEventListener("click", function() {
                        editItem(item.inventory_id);
                    });

                    // ARCHIVE BUTTON
                    const archiveButton = document.createElement("button");
                    archiveButton.type = "button";
                    archiveButton.className = "btn btn-sm btn-danger";
                    archiveButton.innerHTML = '<i class="ti-archive me-1"></i> Archive';
                    archiveButton.title = "Archive this item (can be restored later)";
                    archiveButton.addEventListener("click", function() {
                        confirmDelete(item.inventory_id, false);
                    });

                    actions.append(editButton, archiveButton);
                }
            } else {
                const readOnlyBadge = document.createElement("span");
                readOnlyBadge.className = "badge bg-light text-muted ms-1";
                readOnlyBadge.style.fontSize = "11px";
                readOnlyBadge.textContent = currentView === "archived" ? "Archived" : "View only";
                actions.append(readOnlyBadge);
            }

            row.appendChild(actions);

            tableBody.appendChild(row);
        });
    }

    // =====================================================
    // ADD TABLE CELL
    // =====================================================

    function addCell(row, value) {
        const cell = document.createElement("td");

        /*
         * IMPORTANT:
         * No "? ?" syntax.
         */

        cell.textContent =
            value !== null && value !== undefined && value !== "" ? value : "N/A";

        row.appendChild(cell);
    }

    // =====================================================
    // FORMAT DATE
    // =====================================================

    function formatDate(value) {
        if (!value) {
            return "N/A";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function generateAutoSku() {
        let maxNum = 0;
        if (Array.isArray(inventory)) {
            inventory.forEach((item) => {
                const match = String(item.sku || "").match(/CLOTH-(\d+)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) maxNum = num;
                }
            });
        }
        if (maxNum > 0) {
            const nextNum = maxNum + 1;
            return `CLOTH-${String(nextNum).padStart(3, "0")}`;
        }
        return `CLOTH-001`;
    }

    // =====================================================
    // ADD ITEM
    // =====================================================

    function openAddModal() {
        editingId = null;
        currentProductImage = null;

        form.reset();
        try {
            image.value = "";
        } catch (e) {}

        image.required = true;

        if (imageHint) {
            imageHint.innerHTML = "Select an image file.";
        }

        form.classList.remove("was-validated");

        document.getElementById("itemModalLabel").textContent =
            "Add Inventory Item";

        document.getElementById("itemSubmitBtn").textContent = "Save Item";

        // Auto-generate SKU and lock as read-only
        sku.value = "Generating...";
        sku.readOnly = true;
        sku.style.backgroundColor = "#e9ecef";
        sku.style.cursor = "not-allowed";

        itemModal.show();

        // Fetch authoritative next unique SKU from server across all products & inventories
        apiRequest(`${API_URL}/next-sku`)
            .then(res => {
                if (res && res.nextSku) {
                    sku.value = res.nextSku;
                } else {
                    sku.value = generateAutoSku();
                }
            })
            .catch(() => {
                sku.value = generateAutoSku();
            });
    }

    // =====================================================
    // SUBMIT FORM
    // =====================================================

    form.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.classList.add("was-validated");

            return;
        }

        const parsedQuantity = Number(quantity.value);
        const parsedPrice = Number(price.value);

        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            alert("Quantity must be greater than zero.");
            quantity.focus();
            form.classList.add("was-validated");
            return;
        }

        if (parsedQuantity > 5000) {
            alert("Quantity cannot exceed 5,000 units.");
            quantity.focus();
            form.classList.add("was-validated");
            return;
        }

        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            alert("Price must be greater than zero.");
            price.focus();
            form.classList.add("was-validated");
            return;
        }

        // Determine image to use: newly chosen file name or existing image (null if none)
        let chosenImage = currentProductImage || null;
        if (image.files && image.files.length > 0) {
            chosenImage = image.files[0].name;
        }

        // ---------------------------------------------
        // DATA MATCHES ecoms.sql
        // ---------------------------------------------

        const data = {
            sku: sku.value.trim(),

            product_name: productName.value.trim(),

            product_description: description.value.trim(),

            product_quantity: parsedQuantity,

            product_price: parsedPrice,

            product_image: chosenImage,
        };

        try {
            // =========================================
            // CREATE
            // =========================================

            if (editingId === null) {
                await apiRequest(API_URL, {
                    method: "POST",

                    body: JSON.stringify(data),
                });

                alert("Inventory item added successfully.");
            }

            // =========================================
            // UPDATE
            // =========================================
            else {
                await apiRequest(`${API_URL}/${editingId}`, {
                    method: "PUT",

                    body: JSON.stringify(data),
                });

                alert("Inventory item updated successfully.");
            }

            itemModal.hide();

            form.reset();

            form.classList.remove("was-validated");

            editingId = null;

            await loadInventory();
        } catch (error) {
            console.error("Save inventory error:", error);

            alert(error.message);
        }
    });

    // =====================================================
    // EDIT ITEM
    // =====================================================

    function editItem(id) {
        const item = inventory.find(
            (record) => Number(record.inventory_id) === Number(id),
        );

        if (!item) {
            alert("Inventory item not found.");

            return;
        }

        editingId = Number(item.inventory_id);
        currentProductImage = item.product_image || null;

        sku.value = item.sku || "";
        sku.readOnly = true;
        sku.style.backgroundColor = "#e9ecef";
        sku.style.cursor = "not-allowed";

        productName.value = item.product_name || "";

        description.value = item.product_description || "";

        quantity.value = item.product_quantity !== undefined ? item.product_quantity : "";

        price.value = item.product_price !== null && item.product_price !== undefined ? item.product_price : "";

        // File input .value can only be set to empty string programmatically in browsers
        try {
            image.value = "";
        } catch (e) {}

        image.required = false;

        if (imageHint) {
            if (currentProductImage) {
                imageHint.innerHTML = `Current image: <strong>${currentProductImage}</strong> (Select new file only if you wish to change it)`;
            } else {
                imageHint.innerHTML = `No image set. (Select a file if you wish to upload an image)`;
            }
        }

        document.getElementById("itemModalLabel").textContent =
            "Edit Inventory Item";

        document.getElementById("itemSubmitBtn").textContent = "Update Item";

        form.classList.remove("was-validated");

        itemModal.show();
    }

    // =====================================================
    // VIEW ITEM
    // =====================================================

    function viewItem(id) {
        if (!viewModal) {
            return;
        }

        const item = inventory.find(
            (record) => Number(record.inventory_id) === Number(id),
        );

        if (!item) {
            return;
        }

        document.getElementById("viewInventoryId").textContent =
            item.inventory_id || "N/A";

        document.getElementById("viewSku").textContent = item.sku || "N/A";

        document.getElementById("viewProductName").textContent =
            item.product_name || "N/A";

        document.getElementById("viewDescription").textContent =
            item.product_description || "N/A";

        document.getElementById("viewQuantity").textContent =
            item.product_quantity || "N/A";

        document.getElementById("viewPrice").textContent =
            item.product_price !== null && item.product_price !== undefined ?
            `₱${Number(item.product_price).toFixed(2)}` :
            "N/A";

        const viewImgEl = document.getElementById("viewImage");
        if (viewImgEl) {
            if (item.product_image && String(item.product_image).trim() !== "") {
                const imgPath = item.product_image.startsWith("http")
                    ? item.product_image
                    : `../../assets/images/clothing/${item.product_image}`;
                viewImgEl.innerHTML = `<img src="${imgPath}" alt="${item.product_name}" style="max-width: 120px; border-radius: 8px; border: 1px solid #ddd;" /><div class="small text-muted mt-1">${item.product_image}</div>`;
            } else {
                viewImgEl.innerHTML = `<span class="badge bg-light text-muted border">No image</span>`;
            }
        }

        document.getElementById("viewCreatedAt").textContent = formatDate(
            item.created_at,
        );

        viewModal.show();
    }

    // =====================================================
    // CONFIRM DELETE / ARCHIVE
    // =====================================================

    function confirmDelete(id, permanent = false) {
        const item = inventory.find(
            (record) => Number(record.inventory_id) === Number(id),
        );

        if (!item) {
            return;
        }

        deletingId = Number(item.inventory_id);
        isPermanentDelete = permanent;

        const nameEl = document.getElementById("deleteItemName");
        if (nameEl) nameEl.textContent = item.product_name || "this item";

        const titleEl = document.getElementById("deleteItemModalLabel");
        const helpEl = document.getElementById("deleteModalHelpText");
        const confirmBtn = document.getElementById("confirmDeleteBtn");

        if (permanent) {
            if (titleEl) titleEl.textContent = "Permanently Delete Item";
            if (helpEl) helpEl.innerHTML = '<span class="text-danger"><i class="ti-alert me-1"></i> Warning: This item will be permanently removed from the database and cannot be recovered.</span>';
            if (confirmBtn) {
                confirmBtn.className = "btn btn-danger";
                confirmBtn.textContent = "Delete Permanently";
            }
        } else {
            if (titleEl) titleEl.textContent = "Archive Inventory Item";
            if (helpEl) helpEl.innerHTML = '<i class="ti-info-alt me-1"></i> This item will be moved to the <strong>Archived</strong> tab and hidden from the shop. You can restore it anytime.';
            if (confirmBtn) {
                confirmBtn.className = "btn btn-danger";
                confirmBtn.textContent = "Archive";
            }
        }

        deleteModal.show();
    }

    // =====================================================
    // DELETE / ARCHIVE CONFIRM ACTION
    // =====================================================

    confirmDeleteBtn.addEventListener("click", async function() {
        if (deletingId === null) {
            return;
        }

        try {
            const url = isPermanentDelete ? `${API_URL}/${deletingId}?permanent=true` : `${API_URL}/${deletingId}`;
            const res = await apiRequest(url, {
                method: "DELETE",
            });

            deleteModal.hide();

            alert(res.message || (isPermanentDelete ? "Inventory item permanently deleted." : "Inventory item archived successfully."));

            deletingId = null;
            isPermanentDelete = false;

            await loadInventory();
        } catch (error) {
            console.error("Delete/Archive inventory error:", error);

            alert(error.message);
        }
    });

    // =====================================================
    // CONFIRM RESTORE
    // =====================================================

    function confirmRestore(id) {
        const item = inventory.find(
            (record) => Number(record.inventory_id) === Number(id),
        );

        if (!item) {
            return;
        }

        restoringId = Number(item.inventory_id);

        const restoreNameEl = document.getElementById("restoreItemName");
        if (restoreNameEl) {
            restoreNameEl.textContent = item.product_name || "this item";
        }

        if (restoreModal) {
            restoreModal.show();
        } else if (confirm(`Do you want to restore "${item.product_name}" to active inventory?`)) {
            performRestore();
        }
    }

    // =====================================================
    // RESTORE CONFIRM ACTION
    // =====================================================

    async function performRestore() {
        if (restoringId === null) {
            return;
        }

        try {
            const res = await apiRequest(`${API_URL}/${restoringId}/restore`, {
                method: "POST",
            });

            if (restoreModal) {
                restoreModal.hide();
            }

            alert(res.message || "Inventory item restored successfully!");

            restoringId = null;

            await loadInventory();
        } catch (error) {
            console.error("Restore inventory error:", error);

            alert(error.message);
        }
    }

    if (confirmRestoreBtn) {
        confirmRestoreBtn.addEventListener("click", performRestore);
    }

    // =====================================================
    // ADD BUTTON
    // =====================================================

    addItemBtn.addEventListener("click", openAddModal);

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    loadInventory();
}

// =========================================================
// START
// =========================================================

initializeInventory();