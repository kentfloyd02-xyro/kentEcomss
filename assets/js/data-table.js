(function ($) {
    "use strict";

    const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
    const API_ADMIN = `http://${API_HOST}:3000/api/admin`;
    const API_REPORTS = `http://${API_HOST}:3000/api/reports`;

    function getAuthHeaders(extra = {}) {
        const token = localStorage.getItem("ecoms_session_token");
        return {
            ...extra,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Suppress intrusive DataTables alerts
    if ($.fn && $.fn.dataTable) {
        $.fn.dataTable.ext.errMode = "none";
    }

    function initTableWithDataTables(selector) {
        const $table = $(selector);
        if (!$table.length) return;
        if ($.fn.DataTable.isDataTable($table)) {
            $table.DataTable().destroy();
        }
        $table.DataTable({
            aLengthMenu: [
                [5, 10, 25, -1],
                [5, 10, 25, "All"],
            ],
            iDisplayLength: 10,
            language: { search: "" },
        });
        $table.each(function () {
            const datatable = $(this);
            const search_input = datatable.closest(".dataTables_wrapper").find("div[id$=_filter] input");
            search_input.attr("placeholder", "Search");
            search_input.removeClass("form-control-sm");
        });
    }

    // =========================================================
    // 1. PRODUCT MANAGEMENT (Restock, In stock / Low stock / No stock)
    // =========================================================
    async function loadProductManagement() {
        const table = document.getElementById("product-table");
        if (!table) return;
        const tbody = table.querySelector("tbody");

        try {
            const res = await fetch(`${API_ADMIN}/products`, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const data = await res.json();
            const products = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (products.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No products found.</td></tr>`;
                return;
            }

            tbody.innerHTML = products.map(p => {
                const stock = Number(p.stock || 0);
                let badgeClass = "bg-success";
                let badgeText = "In stock";
                let badgeStyle = "background-color: #198754 !important;";

                if (stock === 0) {
                    badgeClass = "bg-secondary";
                    badgeText = "No stock";
                    badgeStyle = "background-color: #6c757d !important;";
                } else if (stock <= 5) {
                    badgeClass = "bg-danger";
                    badgeText = "Low stock";
                    badgeStyle = "background-color: #dc3545 !important;";
                }

                const dateStr = p.date ? new Date(p.date).toLocaleDateString() : "2026-09-12";

                return `
                    <tr>
                        <td class="font-weight-bold">#${p.product_id}</td>
                        <td><code>${p.product_sku || "SKU-000"}</code></td>
                        <td class="font-weight-medium">${p.product_name}</td>
                        <td class="small text-muted" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${p.product_description || "Thrifted vintage collection."}
                        </td>
                        <td>
                            <span class="badge ${badgeClass} text-white px-2 py-1" style="${badgeStyle}">
                                ${badgeText} (${stock})
                            </span>
                        </td>
                        <td class="font-weight-bold" style="color: #843800;">₱ ${Number(p.product_price || 0).toFixed(2)}</td>
                        <td><small class="text-muted">${dateStr}</small></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-primary btn-restock-modal" 
                                    data-id="${p.product_id}" 
                                    data-name="${p.product_name}" 
                                    data-stock="${stock}">
                                <i class="ti-plus me-1"></i> Restock
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");

            // Attach restock button handlers
            tbody.querySelectorAll(".btn-restock-modal").forEach(btn => {
                btn.addEventListener("click", function () {
                    const id = this.getAttribute("data-id");
                    const name = this.getAttribute("data-name");
                    const stock = this.getAttribute("data-stock");

                    document.getElementById("restockProductName").textContent = name;
                    document.getElementById("restockCurrentStock").textContent = stock;
                    document.getElementById("restockForm").setAttribute("data-target-id", id);
                    document.getElementById("restockQuantity").value = "";

                    const modalEl = document.getElementById("restockModal");
                    if (modalEl) {
                        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    }
                });
            });

            initTableWithDataTables("#product-table");
        } catch (err) {
            console.error("Load products error:", err);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load product table.</td></tr>`;
        }
    }

    // Handle restock form submit
    const restockForm = document.getElementById("restockForm");
    if (restockForm && !restockForm.hasAttribute("data-bound")) {
        restockForm.setAttribute("data-bound", "true");
        restockForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const id = this.getAttribute("data-target-id");
            const qty = parseInt(document.getElementById("restockQuantity").value, 10);

            if (isNaN(qty) || qty <= 0) {
                alert("Please enter a valid whole number greater than zero.");
                return;
            }

            try {
                const res = await fetch(`${API_ADMIN}/products/${id}/restock`, {
                    method: "POST",
                    headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                    body: JSON.stringify({ quantity: qty })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    alert(data.message || "Product restocked successfully!");
                    const modalEl = document.getElementById("restockModal");
                    if (modalEl) {
                        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
                    }
                    await loadProductManagement();
                } else {
                    alert(data.message || "Failed to restock product.");
                }
            } catch (err) {
                console.error(err);
                alert("Restock error.");
            }
        });
    }

    // =========================================================
    // 2. ORDERS MANAGEMENT (Reordered columns: Waybill last, Status, Action)
    // =========================================================
    async function loadOrdersManagement() {
        const table = document.getElementById("order-listing");
        if (!table) return;
        // Check if on Orders page (Customer page uses #customer-listing now)
        const thead = table.querySelector("thead");
        if (!thead || !thead.textContent.includes("Ship To")) return;

        const tbody = table.querySelector("tbody");

        try {
            const res = await fetch(`${API_ADMIN}/orders`, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const data = await res.json();
            const orders = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No orders recorded yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = orders.map(o => {
                const status = (o.status || "pending").toLowerCase();
                let statusBadge = "";
                let actionBtn = "";

                if (status === "pending") {
                    statusBadge = '<span class="badge bg-warning text-dark px-2 py-1">Pending</span>';
                    actionBtn = `
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-primary btn-order-next" data-id="${o.order_id}" title="Advance to Preparing">
                                <i class="ti-arrow-right me-1"></i> Next
                            </button>
                            <button class="btn btn-outline-danger btn-order-cancel" data-id="${o.order_id}" title="Cancel Order">
                                <i class="ti-close"></i>
                            </button>
                        </div>
                    `;
                } else if (status === "preparing") {
                    statusBadge = '<span class="badge bg-info text-white px-2 py-1">Preparing</span>';
                    actionBtn = `
                        <button class="btn btn-sm btn-primary btn-order-next" data-id="${o.order_id}" title="Advance to Shipping">
                            <i class="ti-arrow-right me-1"></i> Next
                        </button>
                    `;
                } else if (status === "shipping" || status === "shipped") {
                    statusBadge = '<span class="badge bg-primary text-white px-2 py-1">Shipping</span>';
                    actionBtn = `
                        <button class="btn btn-sm btn-success btn-order-next" data-id="${o.order_id}" title="Advance to Delivered">
                            <i class="ti-check me-1"></i> Next
                        </button>
                    `;
                } else if (status === "delivered") {
                    statusBadge = '<span class="badge bg-success text-white px-2 py-1">Delivered</span>';
                    actionBtn = `<span class="badge bg-light text-muted">Completed</span>`;
                } else if (status === "cancelled") {
                    statusBadge = '<span class="badge bg-danger text-white px-2 py-1">Cancelled</span>';
                    actionBtn = `<span class="badge bg-light text-danger">Closed</span>`;
                }

                const dateStr = o.order_date ? new Date(o.order_date).toLocaleString() : "Recently";
                const amount = Number(o.order_amount || 0).toFixed(2);

                return `
                    <tr>
                        <td class="font-weight-bold">#${o.order_id}</td>
                        <td>
                            <div class="fw-semibold text-dark">${o.customer_name || "Valued Customer"}</div>
                            <small class="text-muted">${o.order_address || ""}</small>
                        </td>
                        <td><small class="text-muted">${dateStr}</small></td>
                        <td class="font-weight-bold" style="color: #843800;">₱ ${amount}</td>
                        <td><span class="badge bg-light text-dark">${o.payment_method || "GCash"}</span></td>
                        <td>${statusBadge}</td>
                        <td class="text-center">${actionBtn}</td>
                        <td>
                            <a href="javascript:void(0)" class="badge bg-light font-monospace text-primary border text-decoration-none btn-view-waybill" 
                               data-id="${o.order_id}" title="Click to view printable Waybill sheet" style="cursor: pointer; padding: 6px 10px;">
                                <i class="ti-receipt me-1"></i>${o.order_waybill || "N/A"}
                            </a>
                        </td>
                    </tr>
                `;
            }).join("");

            // Attach Next button handlers
            tbody.querySelectorAll(".btn-order-next").forEach(btn => {
                btn.addEventListener("click", async function () {
                    const id = this.getAttribute("data-id");
                    await updateOrderStatus(id, "next", this);
                });
            });

            // Attach Cancel button handlers
            tbody.querySelectorAll(".btn-order-cancel").forEach(btn => {
                btn.addEventListener("click", async function () {
                    const id = this.getAttribute("data-id");
                    if (confirm(`Are you sure you want to cancel Order #${id}?`)) {
                        await updateOrderStatus(id, "cancel", this);
                    }
                });
            });

            // Attach Waybill click handlers
            tbody.querySelectorAll(".btn-view-waybill").forEach(btn => {
                btn.addEventListener("click", function () {
                    const id = this.getAttribute("data-id");
                    openWaybillModal(id);
                });
            });

            initTableWithDataTables("#order-listing");
        } catch (err) {
            console.error("Load orders error:", err);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Failed to load orders.</td></tr>`;
        }
    }

    async function updateOrderStatus(orderId, action, buttonEl) {
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        }

        try {
            const res = await fetch(`${API_ADMIN}/orders/${orderId}/status`, {
                method: "PATCH",
                headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                body: JSON.stringify({ action: action })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Dynamically refresh orders table in place immediately (no page refresh needed!)
                await loadOrdersManagement();
            } else {
                alert(data.message || "Failed to update order status.");
                if (buttonEl) buttonEl.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert("Order update error.");
            if (buttonEl) buttonEl.disabled = false;
        }
    }

    // =========================================================
    // 2.B DELIVERY STATUS SPECIFIC PAGES (Pending, Preparing, Shipped, Delivered, Cancelled)
    // =========================================================
    async function loadDeliveryStatusOrders(tableId, targetStatus, statusLabel, badgeClass) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector("tbody");

        try {
            const res = await fetch(`${API_ADMIN}/orders?status=${encodeURIComponent(targetStatus)}`, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const data = await res.json();
            const orders = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No ${statusLabel} orders found.</td></tr>`;
                return;
            }

            tbody.innerHTML = orders.map(o => {
                const dateStr = o.order_date ? new Date(o.order_date).toLocaleString() : "Recently";
                const amount = Number(o.order_amount || 0).toFixed(2);
                const lastColHtml = targetStatus === "cancelled"
                    ? `<td>
                        <span class="badge bg-light text-danger border border-danger-subtle fw-semibold px-2 py-1 text-wrap text-start" style="font-size: 11.5px; max-width: 220px; display: inline-block;">
                            <i class="ti-info-alt me-1"></i>${escapeHtml(o.cancel_reason || "No reason specified")}
                        </span>
                       </td>`
                    : `<td>
                        <a href="javascript:void(0)" class="badge bg-light font-monospace text-primary border text-decoration-none btn-view-waybill" 
                           data-id="${o.order_id}" title="Click to view printable Waybill sheet" style="cursor: pointer; padding: 6px 10px;">
                            <i class="ti-receipt me-1"></i>${o.order_waybill || "N/A"}
                        </a>
                       </td>`;

                return `
                    <tr>
                        <td class="font-weight-bold">#${o.order_id}</td>
                        <td>
                            <div class="fw-semibold text-dark">${o.customer_name || "Valued Customer"}</div>
                            <small class="text-muted">${o.order_address || ""}</small>
                        </td>
                        <td><small class="text-muted">${dateStr}</small></td>
                        <td class="font-weight-bold" style="color: #843800;">₱ ${amount}</td>
                        <td><span class="badge bg-light text-dark">${o.payment_method || "GCash"}</span></td>
                        <td><span class="badge ${badgeClass} text-white px-2 py-1">${o.status}</span></td>
                        ${lastColHtml}
                    </tr>
                `;
            }).join("");

            // Attach Waybill click handlers only if not cancelled
            if (targetStatus !== "cancelled") {
                tbody.querySelectorAll(".btn-view-waybill").forEach(btn => {
                    btn.addEventListener("click", function () {
                        const id = this.getAttribute("data-id");
                        openWaybillModal(id);
                    });
                });
            }

            initTableWithDataTables(`#${tableId}`);
        } catch (err) {
            console.error(`Load ${targetStatus} error:`, err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load ${statusLabel} orders.</td></tr>`;
        }
    }

    // =========================================================
    // 2.C WAYBILL MODAL POPUP & PRINT CONTROLLER
    // =========================================================
    async function openWaybillModal(orderId) {
        const modalEl = document.getElementById("waybillModal");
        if (!modalEl) {
            alert(`Waybill Document for Order #${orderId}`);
            return;
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();

        // Show loading in product table
        const prodTbody = document.getElementById("wbProductTableBody");
        if (prodTbody) {
            prodTbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-success me-2"></div>Loading Waybill Document...</td></tr>`;
        }

        try {
            const res = await fetch(`${API_ADMIN}/orders/${orderId}/waybill`, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || "Unable to load waybill details.");
                return;
            }

            const wb = data.waybill;

            document.getElementById("wbNumberDisplay").textContent = wb.waybill_number || ("UTRO-" + Math.floor(100000 + Math.random() * 900000));
            document.getElementById("wbOrderRefDisplay").textContent = `Order Ref: ${wb.order_ref || `ORD-${wb.order_id}`}`;
            document.getElementById("wbPrintedDateDisplay").textContent = `Printed: ${wb.printed_at || new Date().toLocaleString()}`;

            // Fill Sender Profile
            document.getElementById("wbSellerName").textContent = wb.seller.name || "Seller / Shop Profile";
            document.getElementById("wbSellerEmail").textContent = wb.seller.email || "No email saved";
            document.getElementById("wbSellerPhone").textContent = wb.seller.phone || "No contact number saved";
            document.getElementById("wbSellerAddress").textContent = wb.seller.address || "Philippines";

            // Fill Deliver To (Recipient)
            document.getElementById("wbRecipientName").textContent = wb.recipient.name || "Valued Customer";
            document.getElementById("wbRecipientEmail").textContent = wb.recipient.email || "No email saved";
            document.getElementById("wbRecipientPhone").textContent = wb.recipient.phone || "No contact number saved";
            document.getElementById("wbRecipientAddress").textContent = wb.recipient.address || "Philippines";

            // Fill 8 Info Pill Boxes
            document.getElementById("wbPillOrderNum").textContent = wb.order_ref;
            const orderDateStr = wb.order_date ? new Date(wb.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recently";
            document.getElementById("wbPillOrderDate").textContent = orderDateStr;
            document.getElementById("wbPillPayment").textContent = wb.payment_method || "GCash";
            
            const pillStatus = document.getElementById("wbPillStatus");
            pillStatus.textContent = wb.status;
            if (wb.status === "cancelled") {
                pillStatus.className = "fw-bold text-danger text-capitalize";
            } else if (wb.status === "pending") {
                pillStatus.className = "fw-bold text-warning text-capitalize";
            } else {
                pillStatus.className = "fw-bold text-success text-capitalize";
            }

            document.getElementById("wbPillCustomer").textContent = wb.recipient.name;
            document.getElementById("wbPillRecipient").textContent = wb.recipient.name;
            document.getElementById("wbPillEstDelivery").textContent = wb.status === "delivered" ? "Delivered" : "2-3 Business Days";
            document.getElementById("wbPillItemCount").textContent = wb.item_count || 1;

            // Fill Products Table
            const items = Array.isArray(wb.items) ? wb.items : [];
            if (items.length === 0) {
                prodTbody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted">No line items recorded.</td></tr>`;
            } else {
                prodTbody.innerHTML = items.map((it, idx) => {
                    const unitPrice = Number(it.unit_price || 0).toFixed(2);
                    const lineTotal = Number(it.line_total || (it.quantity * it.unit_price) || 0).toFixed(2);

                    return `
                        <tr>
                            <td class="fw-bold">${idx + 1}</td>
                            <td class="fw-semibold text-dark">${it.product_name}</td>
                            <td><code>${it.sku || "VINTAGE-01"}</code></td>
                            <td class="text-center font-weight-bold">${it.quantity || 1}</td>
                            <td>PHP ${Number(unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="fw-bold" style="color: #2e7d32;">PHP ${Number(lineTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td><span class="badge bg-light text-success fw-bold text-capitalize">${wb.status}</span></td>
                        </tr>
                    `;
                }).join("");
            }

            // Fill Total Amount
            document.getElementById("wbOrderTotalDisplay").textContent = `PHP ${Number(wb.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

            // Setup Print Button
            const printBtn = document.getElementById("btnPrintWaybill");
            if (printBtn && !printBtn.hasAttribute("data-bound")) {
                printBtn.setAttribute("data-bound", "true");
                printBtn.addEventListener("click", function () {
                    window.print();
                });
            }
        } catch (err) {
            console.error("Open waybill error:", err);
            alert("Error loading waybill document.");
        }
    }

    // =========================================================
    // 3. CUSTOMER DIRECTORY (Name, Location, Phone, Ordered Items - No Status & Action)
    // =========================================================
    async function loadCustomerDirectory() {
        const table = document.getElementById("customer-listing");
        if (!table) return;
        const tbody = table.querySelector("tbody");

        try {
            const res = await fetch(`${API_ADMIN}/customers`, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const data = await res.json();
            const customers = (data && data.success && Array.isArray(data.data)) ? data.data : [];

            if (customers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No customers found.</td></tr>`;
                return;
            }

            tbody.innerHTML = customers.map(c => {
                return `
                    <tr>
                        <td class="font-weight-bold">#${c.customer_id}</td>
                        <td class="font-weight-medium text-dark">${c.customer_name || "Valued Customer"}</td>
                        <td>${c.location || "Philippines"}</td>
                        <td><code>${c.phone_number || "09XXXXXXXXX"}</code></td>
                        <td>
                            <span class="badge bg-light text-dark font-weight-normal text-wrap" style="max-width: 240px; text-align: left;">
                                ${c.ordered_items || "None"}
                            </span>
                        </td>
                        <td><span class="badge bg-primary text-white">${c.total_orders || 1} order(s)</span></td>
                    </tr>
                `;
            }).join("");

            initTableWithDataTables("#customer-listing");
        } catch (err) {
            console.error("Load customers error:", err);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load customer list.</td></tr>`;
        }
    }

    // =========================================================
    // 4. REPORTS MANAGEMENT & FILE/IMAGE UPLOAD
    // =========================================================
    async function loadReportsManagement() {
        const tbody = document.getElementById("reportsTableBody");
        if (!tbody) return;

        try {
            const res = await fetch(API_REPORTS, {
                headers: getAuthHeaders({ Accept: "application/json" })
            });
            const result = await res.json();
            const reports = (result && result.success && Array.isArray(result.data)) ? result.data : [];
            const summary = result.summary || {};

            // Update stats counters in Reports.html
            const elVal = document.getElementById("reportStatOrderValue");
            if (elVal) elVal.textContent = `₱ ${Number(summary.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

            const elOrders = document.getElementById("reportStatOrdersCount");
            if (elOrders) elOrders.textContent = summary.totalOrders || 0;

            const elUsers = document.getElementById("reportStatUsersCount");
            if (elUsers) elUsers.textContent = summary.totalUsers || 0;

            const elReports = document.getElementById("reportStatReportsCount");
            if (elReports) elReports.textContent = reports.length;

            if (reports.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No reports found. Click "Insert Report" to upload one.</td></tr>`;
                return;
            }

            tbody.innerHTML = reports.map(r => {
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString() : "2026-09-14";
                const isImg = /\.(png|jpg|jpeg|webp)$/i.test(r.file_name || "");
                const fileLink = `http://${API_HOST}:3000/uploads/${encodeURIComponent(r.file_name)}`;

                const preview = isImg 
                    ? `<a href="${fileLink}" target="_blank" class="d-inline-flex align-items-center text-primary"><i class="ti-image me-1"></i> ${r.file_name}</a>`
                    : `<a href="${fileLink}" target="_blank" class="d-inline-flex align-items-center text-primary"><i class="ti-file me-1"></i> ${r.file_name}</a>`;

                return `
                    <tr>
                        <td class="font-weight-bold">#${r.id}</td>
                        <td><span class="badge bg-info text-white">${r.report_type}</span></td>
                        <td>${preview}</td>
                        <td class="font-weight-medium">${r.name}</td>
                        <td><small class="text-muted">${dateStr}</small></td>
                    </tr>
                `;
            }).join("");

            // Setup Upload Form
            const form = document.getElementById("insertReportForm");
            if (form && !form.hasAttribute("data-bound")) {
                form.setAttribute("data-bound", "true");
                form.addEventListener("submit", async function (e) {
                    e.preventDefault();
                    const saveBtn = document.getElementById("saveReportBtn");
                    if (saveBtn) {
                        saveBtn.disabled = true;
                        saveBtn.textContent = "Uploading...";
                    }

                    const formData = new FormData(this);
                    try {
                        const token = localStorage.getItem("ecoms_session_token");
                        const postRes = await fetch(API_REPORTS, {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: formData
                        });
                        const postData = await postRes.json();
                        if (postRes.ok && postData.success) {
                            alert("Report successfully saved!");
                            const modalEl = document.getElementById("createReport");
                            if (modalEl) {
                                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
                            }
                            form.reset();
                            await loadReportsManagement();
                        } else {
                            alert(postData.message || "Failed to save report.");
                        }
                    } catch (uploadErr) {
                        console.error(uploadErr);
                        alert("Error uploading report file.");
                    } finally {
                        if (saveBtn) {
                            saveBtn.disabled = false;
                            saveBtn.textContent = "Save Report";
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Load reports error:", err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load reports.</td></tr>`;
        }
    }

    // Auto-dispatch based on active elements
    $(function () {
        if ($("#product-table").length) {
            loadProductManagement();
        }
        if ($("#order-listing").length) {
            loadOrdersManagement();
        }
        if ($("#customer-listing").length) {
            loadCustomerDirectory();
        }
        if ($("#reportsTableBody").length) {
            loadReportsManagement();
        }
        if ($("#pending-orders-table").length) {
            loadDeliveryStatusOrders("pending-orders-table", "pending", "Pending", "bg-warning");
        }
        if ($("#preparing-orders-table").length) {
            loadDeliveryStatusOrders("preparing-orders-table", "preparing", "Preparing", "bg-info");
        }
        if ($("#shipped-orders-table").length) {
            loadDeliveryStatusOrders("shipped-orders-table", "shipping", "Shipping", "bg-primary");
        }
        if ($("#delivered-orders-table").length) {
            loadDeliveryStatusOrders("delivered-orders-table", "delivered", "Delivered", "bg-success");
        }
        if ($("#cancelled-orders-table").length) {
            loadDeliveryStatusOrders("cancelled-orders-table", "cancelled", "Cancelled", "bg-danger");
        }
    });

    // Expose for layout re-navigation
    window.loadProductManagement = loadProductManagement;
    window.loadOrdersManagement = loadOrdersManagement;
    window.loadCustomerDirectory = loadCustomerDirectory;
    window.loadReportsManagement = loadReportsManagement;
    window.loadDeliveryStatusOrders = loadDeliveryStatusOrders;
    window.openWaybillModal = openWaybillModal;

})(jQuery);