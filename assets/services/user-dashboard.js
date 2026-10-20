(function () {
    "use strict";

    const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
    const API_INVENTORY = `http://${API_HOST}:3000/api/inventory`;
    const API_SHOP = `http://${API_HOST}:3000/api/shop`;

    function getAuthHeaders(extra = {}) {
        const token = localStorage.getItem("ecoms_session_token");
        return {
            ...extra,
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
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

    let catalogItems = [];
    let currentCart = null;
    let transactionsList = [];

    async function initUserDashboard() {
        const catalogGrid = document.getElementById("catalogGrid");
        const cartTableBody = document.getElementById("cartTableBody");
        const checkoutBtn = document.getElementById("checkoutBtn");
        const transTableBody = document.getElementById("transactionsTableBody");

        // Wait if slot content is still being injected
        if (!catalogGrid && !cartTableBody && !transTableBody && !checkoutBtn) {
            const slot = document.getElementById("page-content-slot");
            if (slot && !slot.innerHTML.trim()) {
                setTimeout(initUserDashboard, 100);
                return;
            }
        }

        setupEventListeners();

        const tasks = [];
        if (catalogGrid) {
            tasks.push(loadCatalog());
        }
        if (cartTableBody || checkoutBtn) {
            tasks.push(loadCart());
        }
        if (transTableBody) {
            tasks.push(loadTransactions());
        }

        // Keep cart badge and summary updated across all pages
        if (!cartTableBody && !checkoutBtn) {
            tasks.push(loadCart());
        }

        await Promise.allSettled(tasks);
    }

    function setupEventListeners() {
        initCancelModalEvents();

        const refreshBtn = document.getElementById("refreshDashboardBtn");
        if (refreshBtn && !refreshBtn.hasAttribute("data-bound")) {
            refreshBtn.setAttribute("data-bound", "true");
            refreshBtn.addEventListener("click", () => {
                loadCatalog();
                loadCart();
                loadTransactions();
            });
        }

        const checkoutBtn = document.getElementById("checkoutBtn");
        if (checkoutBtn && !checkoutBtn.hasAttribute("data-bound")) {
            checkoutBtn.setAttribute("data-bound", "true");
            checkoutBtn.addEventListener("click", handleCheckout);
        }

        const searchBox = document.getElementById("itemSearchBox");
        if (searchBox && !searchBox.hasAttribute("data-bound")) {
            searchBox.setAttribute("data-bound", "true");
            searchBox.addEventListener("input", function (e) {
                const term = e.target.value.toLowerCase().trim();
                renderCatalog(term);
            });
        }

        // Pre-fill username if available
        const nameInput = document.getElementById("checkoutFullName");
        if (nameInput && !nameInput.value) {
            const savedUsername = localStorage.getItem("ecoms_username");
            if (savedUsername) nameInput.value = savedUsername;
        }

        // Real-time phone number formatting: digits only, max 10 digits starting with 9
        const phoneInput = document.getElementById("checkoutPhone");
        if (phoneInput && !phoneInput.hasAttribute("data-bound")) {
            phoneInput.setAttribute("data-bound", "true");
            phoneInput.addEventListener("input", function () {
                let val = this.value.replace(/\D/g, "");
                if (val.startsWith("63") && val.length > 10) {
                    val = val.slice(2);
                }
                if (val.startsWith("0")) {
                    val = val.replace(/^0+/, "");
                }
                if (val.length > 10) {
                    val = val.slice(0, 10);
                }
                this.value = val;
            });
        }
    }

    async function loadAllDashboardData() {
        await Promise.all([
            loadCatalog(),
            loadCart(),
            loadTransactions(),
        ]);
    }

    // 1. LOAD ITEMS CATALOG
    async function loadCatalog() {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;

        try {
            const res = await fetch(API_INVENTORY, {
                method: "GET",
                credentials: "include",
                headers: getAuthHeaders({ Accept: "application/json" }),
            });
            const data = await res.json();
            catalogItems = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);

            const statAvailable = document.getElementById("statAvailableItems");
            if (statAvailable) statAvailable.textContent = catalogItems.length;

            renderCatalog();
        } catch (err) {
            console.error("Load catalog error:", err);
            grid.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to load catalog.</div>`;
        }
    }

    function renderCatalog(filter = "") {
        const grid = document.getElementById("catalogGrid");
        if (!grid) return;

        const filtered = catalogItems.filter(item => {
            const name = (item.product_name || "").toLowerCase();
            const desc = (item.product_description || "").toLowerCase();
            return name.includes(filter) || desc.includes(filter);
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="ti-package mb-2" style="font-size: 32px; display: block;"></i>
                    No items found matching "${filter}".
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(item => {
            const imgFile = item.product_image || "c1_item.png";
            const imgSrc = imgFile.startsWith("http") ? imgFile : `../../assets/images/clothing/${imgFile}`;
            const qty = Number(item.product_quantity || 0);

            // Stock conditions:
            // - stock > 5: In Stock (green)
            // - 1 <= stock <= 5: Low Stock (red warning)
            // - stock <= 0: No Stock (gray badge, disabled checkout button)
            let stockBadge = "";
            let btnDisabled = false;
            let btnStyle = "background: #843800; border-radius: 6px;";
            let btnText = '<i class="ti-shopping-cart me-1"></i> Add to Cart';

            if (qty <= 0) {
                stockBadge = '<span class="badge bg-secondary text-white" style="font-size: 10px; background-color: #6c757d !important;">No Stock</span>';
                btnDisabled = true;
                btnStyle = "background: #6c757d; border-color: #6c757d; opacity: 0.65; cursor: not-allowed; border-radius: 6px;";
                btnText = '<i class="ti-na me-1"></i> Out of Stock';
            } else if (qty <= 5) {
                stockBadge = `<span class="badge bg-danger text-white" style="font-size: 10px; background-color: #dc3545 !important;">Low Stock (${qty} left)</span>`;
            } else {
                stockBadge = `<span class="badge bg-success text-white" style="font-size: 10px; background-color: #198754 !important;">In Stock (${qty})</span>`;
            }

            return `
                <div class="col-sm-6 col-md-4 col-xl-4 mb-4">
                    <div class="card h-100 border" style="border-radius: 12px; overflow: hidden; transition: transform 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <div style="height: 180px; background: linear-gradient(135deg, #f7ede2, #e4c7b2); display: flex; align-items: center; justify-content: center; padding: 15px;">
                            <img src="${imgSrc}" alt="${item.product_name}" style="max-height: 100%; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));" onerror="this.src='../../assets/images/clothing/c1_item.png';">
                        </div>
                        <div class="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                                <span class="badge bg-light text-muted mb-1" style="font-size: 10px;">${item.sku || "VINTAGE"}</span>
                                <h6 class="font-weight-bold mb-1 text-dark" style="font-size: 14px;">${item.product_name}</h6>
                                <p class="text-muted small mb-2" style="font-size: 11.5px; line-height: 1.4; max-height: 34px; overflow: hidden;">
                                    ${item.product_description || "Pre-loved thrift selection."}
                                </p>
                            </div>
                            <div class="pt-2 border-top">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span class="fs-16 font-weight-bold" style="color: #843800;">₱ ${Number(item.product_price || 0).toFixed(2)}</span>
                                    ${stockBadge}
                                </div>
                                <button class="btn btn-sm w-100 font-weight-bold btn-add-to-cart text-white" 
                                        data-id="${item.inventory_id}"
                                        ${btnDisabled ? 'disabled' : ''}
                                        style="${btnStyle}">
                                    ${btnText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        grid.querySelectorAll(".btn-add-to-cart").forEach(btn => {
            btn.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                await addToCart(id);
            });
        });
    }

    // 2. ADD TO CART
    async function addToCart(inventoryId) {
        try {
            const res = await fetch(`${API_SHOP}/cart`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                body: JSON.stringify({ inventory_id: inventoryId, quantity: 1 }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.message || "Item added to cart!");
                await loadCart();
            } else {
                alert(data.message || "Failed to add to cart.");
            }
        } catch (err) {
            console.error(err);
            alert("Error adding item to cart.");
        }
    }

    // 3. LOAD CART
    async function loadCart() {
        try {
            const res = await fetch(`${API_SHOP}/cart`, {
                method: "GET",
                credentials: "include",
                headers: getAuthHeaders({ Accept: "application/json" }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                currentCart = data.cart;
                renderCart(currentCart);
            }
        } catch (err) {
            console.error("Load cart error:", err);
        }
    }

    function renderCart(cart) {
        const tbody = document.getElementById("cartTableBody");
        const badgeHeader = document.getElementById("cartHeaderBadge");
        const badgeTab = document.getElementById("cartTabCount");
        const statCount = document.getElementById("statCartCount");
        const summaryTotal = document.getElementById("summaryTotalAmount");
        const summaryItems = document.getElementById("summaryTotalItems");

        const count = cart ? cart.totalItems : 0;
        const total = cart ? cart.totalAmount : 0;

        if (badgeHeader) badgeHeader.textContent = count;
        if (badgeTab) badgeTab.textContent = count;
        if (statCount) statCount.textContent = count;
        if (summaryItems) summaryItems.textContent = count;
        if (summaryTotal) summaryTotal.textContent = `₱ ${Number(total).toFixed(2)}`;

        const navCartBadge = document.getElementById("navCartBadge");
        if (navCartBadge) {
            navCartBadge.textContent = count;
            navCartBadge.style.display = count > 0 ? "inline-block" : "none";
        }

        if (!tbody) return;

        if (!cart || !cart.items || cart.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        <i class="ti-shopping-cart mb-2" style="font-size: 28px; display: block;"></i>
                        Your cart is empty. Browse items and add to cart!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = cart.items.map(item => {
            const imgFile = item.product_image || "c1_item.png";
            const imgSrc = imgFile.startsWith("http") ? imgFile : `../../assets/images/clothing/${imgFile}`;
            const rawStock = (item.available_stock !== undefined && item.available_stock !== null) ? Number(item.available_stock) : 0;
            const maxStock = Math.min(rawStock, 250);

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${imgSrc}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; margin-right: 12px; border: 1px solid #ddd;" onerror="this.src='../../assets/images/clothing/c1_item.png';">
                            <div>
                                <h6 class="mb-0 font-weight-bold" style="font-size: 13px;">${item.product_name}</h6>
                                <small class="text-muted">${item.sku || ""}</small>
                            </div>
                        </div>
                    </td>
                    <td>₱ ${Number(item.product_price).toFixed(2)}</td>
                    <td style="width: 150px; min-width: 140px;">
                        <div class="d-flex align-items-center flex-nowrap" style="max-width: 130px;">
                            <button class="btn btn-sm btn-outline-secondary btn-qty-minus px-2" type="button" data-id="${item.cart_item_id}" data-qty="${item.quantity}" style="border-radius: 6px 0 0 6px; height: 32px; min-width: 32px; line-height: 1;">-</button>
                            <input type="number" min="1" max="${maxStock}" class="form-control form-control-sm text-center cart-qty-input px-1" data-id="${item.cart_item_id}" data-price="${item.product_price}" data-max="${maxStock}" value="${item.quantity}" style="border-radius: 0; height: 32px; width: 55px; min-width: 45px; font-weight: 600;">
                            <button class="btn btn-sm btn-outline-secondary btn-qty-plus px-2" type="button" data-id="${item.cart_item_id}" data-qty="${item.quantity}" data-max="${maxStock}" style="border-radius: 0 6px 6px 0; height: 32px; min-width: 32px; line-height: 1;">+</button>
                        </div>
                        <div class="text-muted" style="font-size: 10px; margin-top: 2px;">(Max 250/item)</div>
                    </td>
                    <td class="font-weight-bold cell-subtotal" data-id="${item.cart_item_id}" style="color: #843800;">₱ ${Number(item.subtotal).toFixed(2)}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger btn-remove-item" data-id="${item.cart_item_id}" title="Remove item">
                            <i class="ti-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        // Quantity manual input listeners (instant calculation on typing)
        tbody.querySelectorAll(".cart-qty-input").forEach(input => {
            input.addEventListener("input", function () {
                const id = this.getAttribute("data-id");
                const price = parseFloat(this.getAttribute("data-price")) || 0;
                const max = parseInt(this.getAttribute("data-max"), 10) || 0;
                let val = parseInt(this.value, 10);

                if (isNaN(val) || val < 1) {
                    return;
                }

                if (val > max) {
                    alert(max === 250 ? "Maximum allowed checkout is 250 units per item." : `Maximum stock available for this item is ${max}.`);
                    val = max;
                    this.value = max;
                }

                const subtotalCell = tbody.querySelector(`.cell-subtotal[data-id="${id}"]`);
                if (subtotalCell) {
                    subtotalCell.textContent = `₱ ${(val * price).toFixed(2)}`;
                }

                recalculateCartSummary();
            });

            input.addEventListener("change", async function () {
                const id = this.getAttribute("data-id");
                const max = parseInt(this.getAttribute("data-max"), 10) || 0;
                let val = parseInt(this.value, 10);

                if (isNaN(val) || val < 1) {
                    val = 1;
                    this.value = 1;
                } else if (val > max) {
                    val = max;
                    this.value = max;
                }

                await updateCartItemQty(id, val);
            });
        });

        tbody.querySelectorAll(".btn-qty-minus").forEach(btn => {
            btn.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                const currentQty = parseInt(this.getAttribute("data-qty"), 10);
                if (currentQty <= 1) {
                    if (confirm("Do you want to remove this item from your cart?")) {
                        await removeCartItem(id);
                    }
                } else {
                    await updateCartItemQty(id, currentQty - 1);
                }
            });
        });

        tbody.querySelectorAll(".btn-qty-plus").forEach(btn => {
            btn.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                const currentQty = parseInt(this.getAttribute("data-qty"), 10);
                const max = parseInt(this.getAttribute("data-max"), 10) || 0;
                if (currentQty >= max) {
                    alert(max === 250 ? "You have reached the maximum checkout limit of 250 units for this item." : `Only ${max} unit(s) available in stock.`);
                    return;
                }
                await updateCartItemQty(id, currentQty + 1);
            });
        });

        tbody.querySelectorAll(".btn-remove-item").forEach(btn => {
            btn.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                if (confirm("Are you sure you want to remove this item from your cart?")) {
                    await removeCartItem(id);
                }
            });
        });
    }

    function recalculateCartSummary() {
        const tbody = document.getElementById("cartTableBody");
        if (!tbody) return;

        let totalQty = 0;
        let totalAmt = 0;

        tbody.querySelectorAll(".cart-qty-input").forEach(input => {
            const qty = parseInt(input.value, 10) || 0;
            const price = parseFloat(input.getAttribute("data-price")) || 0;
            totalQty += qty;
            totalAmt += (qty * price);
        });

        const badgeHeader = document.getElementById("cartHeaderBadge");
        const badgeTab = document.getElementById("cartTabCount");
        const statCount = document.getElementById("statCartCount");
        const summaryTotal = document.getElementById("summaryTotalAmount");
        const summaryItems = document.getElementById("summaryTotalItems");
        const navCartBadge = document.getElementById("navCartBadge");

        if (badgeHeader) badgeHeader.textContent = totalQty;
        if (badgeTab) badgeTab.textContent = totalQty;
        if (statCount) statCount.textContent = totalQty;
        if (summaryItems) summaryItems.textContent = totalQty;
        if (summaryTotal) summaryTotal.textContent = `₱ ${totalAmt.toFixed(2)}`;
        if (navCartBadge) {
            navCartBadge.textContent = totalQty;
            navCartBadge.style.display = totalQty > 0 ? "inline-block" : "none";
        }
    }

    async function updateCartItemQty(cartItemId, newQty) {
        try {
            const res = await fetch(`${API_SHOP}/cart/items/${cartItemId}`, {
                method: "PATCH",
                credentials: "include",
                headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                body: JSON.stringify({ quantity: newQty }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to update item quantity.");
            }
            await loadCart();
        } catch (err) {
            console.error("Cart update error:", err);
            alert("Error updating cart quantity.");
        }
    }

    async function removeCartItem(cartItemId) {
        try {
            const res = await fetch(`${API_SHOP}/cart/items/${cartItemId}`, {
                method: "DELETE",
                credentials: "include",
                headers: getAuthHeaders({ Accept: "application/json" }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message || "Failed to remove item.");
            }
            await loadCart();
        } catch (err) {
            console.error("Cart remove error:", err);
            alert("Error removing item from cart.");
        }
    }

    // 4. CHECKOUT
    async function handleCheckout() {
        if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
            alert("Your cart is empty! Please add items first.");
            return;
        }

        const fullName = document.getElementById("checkoutFullName")?.value.trim() || "";
        const address = document.getElementById("checkoutAddress")?.value.trim();
        const phone = document.getElementById("checkoutPhone")?.value.trim();
        const payment = document.getElementById("checkoutPaymentMethod")?.value || "GCash";

        // Condition: User must provide Delivery Address and Phone Number
        if (!address) {
            alert("Please enter your delivery address before proceeding to checkout.");
            const addressInput = document.getElementById("checkoutAddress");
            if (addressInput) addressInput.focus();
            return;
        }

        let cleanPhone = (phone || "").replace(/\D/g, "");
        if (cleanPhone.startsWith("63") && cleanPhone.length > 10) {
            cleanPhone = cleanPhone.slice(2);
        }
        if (cleanPhone.startsWith("0")) {
            cleanPhone = cleanPhone.replace(/^0+/, "");
        }

        if (!cleanPhone) {
            alert("Please enter your contact phone number before proceeding to checkout.");
            const phoneInput = document.getElementById("checkoutPhone");
            if (phoneInput) phoneInput.focus();
            return;
        }

        if (!/^9\d{9}$/.test(cleanPhone)) {
            alert("Invalid phone number! Please enter a valid 10-digit Philippine mobile number starting with 9 (e.g. 9XXXXXXXXX).");
            const phoneInput = document.getElementById("checkoutPhone");
            if (phoneInput) phoneInput.focus();
            return;
        }

        const formattedPhone = "0" + cleanPhone;

        const checkoutBtn = document.getElementById("checkoutBtn");
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = "Processing order...";
        }

        try {
            const res = await fetch(`${API_SHOP}/checkout`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                body: JSON.stringify({
                    checkout_name: fullName,
                    checkout_address: address,
                    checkout_phone: formattedPhone,
                    payment_method: payment,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Order Placed Successfully!\n\nWaybill: ${data.order.waybill}\nTotal Paid: ₱ ${Number(data.order.order_amount).toFixed(2)}\nPayment Method: ${data.order.payment_method}\n\nYour order has been recorded and is now being processed.`);
                await loadCart();
                await loadTransactions();
                await loadCatalog(); // Stock reduced

                // Switch to Transactions Tab or redirect to Transactions page
                const transTabBtn = document.getElementById("tab-transactions-btn");
                if (transTabBtn) {
                    if (typeof bootstrap !== "undefined") {
                        bootstrap.Tab.getOrCreateInstance(transTabBtn).show();
                    } else {
                        transTabBtn.click();
                    }
                } else if (window.location.search.includes("page=Cart")) {
                    window.location.href = "main.html?page=Transactions";
                }
            } else {
                alert(data.message || "Checkout failed. Please try again.");
            }
        } catch (err) {
            console.error(err);
            alert("Checkout error occurred. Please try again.");
        } finally {
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = '<i class="ti-check me-1"></i> Complete Checkout';
            }
        }
    }

    // 5. TRANSACTIONS
    async function loadTransactions() {
        const tbody = document.getElementById("transactionsTableBody");
        const statTrans = document.getElementById("statTransactionsCount");
        const tabTransBadge = document.getElementById("transTabCount");

        try {
            const res = await fetch(`${API_SHOP}/transactions`, {
                method: "GET",
                credentials: "include",
                headers: getAuthHeaders({ Accept: "application/json" }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                transactionsList = Array.isArray(data.transactions) ? data.transactions : [];

                if (statTrans) statTrans.textContent = transactionsList.length;
                if (tabTransBadge) tabTransBadge.textContent = transactionsList.length;

                renderTransactions(transactionsList);
            }
        } catch (err) {
            console.error("Load transactions error:", err);
        }
    }

    function renderTransactions(transactions) {
        const tbody = document.getElementById("transactionsTableBody");
        if (!tbody) return;

        if (transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        No transactions recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = transactions.map(t => {
            const dateStr = t.checked_out_at ? new Date(t.checked_out_at).toLocaleString() : "Recently";
            const waybill = t.order_waybill || ("UTRO-" + Math.floor(100000 + Math.random() * 900000));
            const amount = Number(t.order_amount || 0).toFixed(2);
            const status = (t.status || "pending").toLowerCase();

            let statusBadge = "";
            if (status === "pending") {
                statusBadge = '<span class="badge bg-warning text-dark px-2 py-1"><i class="ti-timer me-1"></i>Pending</span>';
            } else if (status === "preparing") {
                statusBadge = '<span class="badge bg-info text-white px-2 py-1"><i class="ti-package me-1"></i>Preparing</span>';
            } else if (status === "shipping" || status === "shipped") {
                statusBadge = '<span class="badge bg-primary text-white px-2 py-1"><i class="ti-truck me-1"></i>Shipping</span>';
            } else if (status === "delivered") {
                statusBadge = '<span class="badge bg-success text-white px-2 py-1"><i class="ti-check-box me-1"></i>Delivered</span>';
            } else if (status === "cancelled") {
                statusBadge = '<span class="badge bg-danger text-white px-2 py-1"><i class="ti-close me-1"></i>Cancelled</span>';
                if (t.cancel_reason) {
                    statusBadge += `<div class="text-danger small mt-1 font-italic text-wrap" style="font-size: 11px; max-width: 180px;" title="Cancellation Reason"><i class="ti-info-alt me-1"></i>${escapeHtml(t.cancel_reason)}</div>`;
                }
            } else {
                statusBadge = `<span class="badge bg-secondary text-white px-2 py-1 text-capitalize">${status}</span>`;
            }

            let actionBtn = "";
            if (status === "pending" && t.order_id) {
                actionBtn = `<button class="btn btn-sm btn-outline-danger btn-cancel-order py-1 px-2" data-order-id="${t.order_id}" style="font-size: 11.5px; border-radius: 6px;"><i class="ti-close me-1"></i>Cancel Order</button>`;
            } else {
                actionBtn = `<span class="text-muted small" style="font-size: 11px;">N/A</span>`;
            }

            return `
                <tr>
                    <td class="font-weight-bold">#${t.order_id || t.cart_id}</td>
                    <td>
                        <span class="badge bg-light text-dark font-monospace border">${waybill}</span>
                    </td>
                    <td><small class="text-muted">${dateStr}</small></td>
                    <td><span class="badge bg-light text-dark border">${t.payment_method || "GCash"}</span></td>
                    <td>${t.total_items || 1} item(s)</td>
                    <td class="font-weight-bold" style="color: #843800;">₱ ${amount}</td>
                    <td>${statusBadge}</td>
                    <td class="text-center">${actionBtn}</td>
                </tr>
            `;
        }).join("");

        tbody.querySelectorAll(".btn-cancel-order").forEach(btn => {
            btn.addEventListener("click", function () {
                const orderId = this.getAttribute("data-order-id");
                if (!orderId) return;
                openCancelOrderModal(orderId);
            });
        });
    }

    let currentCancelOrderId = null;

    function ensureCancelModalExists() {
        if (document.getElementById("userCancelOrderModal")) return;

        const modalHtml = `
            <div class="modal fade" id="userCancelOrderModal" tabindex="-1" aria-labelledby="userCancelOrderModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border-radius: 14px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                        <div class="modal-header border-0 pb-0">
                            <h5 class="modal-title font-weight-bold text-danger" id="userCancelOrderModalLabel">
                                <i class="ti-close me-1"></i> Cancel Order #<span id="cancelModalOrderId"></span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body py-3">
                            <p class="text-muted small mb-3">
                                Please select the reason for cancelling your order. The reserved items will immediately be returned to stock.
                            </p>

                            <div class="mb-3">
                                <label for="cancelReasonSelect" class="form-label fw-bold text-dark small">
                                    Cancellation Reason <span class="text-danger">*</span>
                                </label>
                                <select class="form-select form-select-sm" id="cancelReasonSelect" style="border-radius: 8px;">
                                    <option value="" selected disabled>-- Select a reason --</option>
                                    <option value="Changed my mind">Changed my mind</option>
                                    <option value="Found cheaper price">Found cheaper price</option>
                                    <option value="Order by mistake">Order by mistake</option>
                                    <option value="Delivery too long">Delivery too long</option>
                                    <option value="Incorrect address">Incorrect address</option>
                                    <option value="other">Other reason</option>
                                </select>
                            </div>

                            <div class="mb-3" id="cancelOtherReasonContainer" style="display: none;">
                                <label for="cancelOtherReasonInput" class="form-label fw-bold text-dark small">
                                    Custom Reason <span class="text-danger">*</span>
                                </label>
                                <input type="text" class="form-control form-control-sm" id="cancelOtherReasonInput" 
                                       placeholder="Type reason (8 to 20 letters)..." maxlength="20" style="border-radius: 8px;">
                                <div class="d-flex justify-content-between align-items-center mt-1">
                                    <small id="cancelReasonFeedback" class="text-muted" style="font-size: 11px;">
                                        Must be between 8 and 20 characters.
                                    </small>
                                    <small id="cancelCharCount" class="text-muted fw-bold font-monospace" style="font-size: 11px;">0/20</small>
                                </div>
                            </div>

                            <div id="cancelModalAlert" class="alert alert-danger py-2 small mb-0 d-none" style="border-radius: 8px;"></div>
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal" style="border-radius: 8px;">Keep Order</button>
                            <button type="button" class="btn btn-danger btn-sm" id="btnConfirmCancelOrder" disabled style="border-radius: 8px;">
                                <i class="ti-close me-1"></i> Confirm Cancellation
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
    }

    function initCancelModalEvents() {
        ensureCancelModalExists();

        const modalEl = document.getElementById("userCancelOrderModal");
        if (!modalEl || modalEl.dataset.initialized === "true") return;
        modalEl.dataset.initialized = "true";

        const reasonSelect = document.getElementById("cancelReasonSelect");
        const otherContainer = document.getElementById("cancelOtherReasonContainer");
        const otherInput = document.getElementById("cancelOtherReasonInput");
        const charCount = document.getElementById("cancelCharCount");
        const feedback = document.getElementById("cancelReasonFeedback");
        const btnConfirm = document.getElementById("btnConfirmCancelOrder");
        const alertBox = document.getElementById("cancelModalAlert");

        function validateReason() {
            if (alertBox) alertBox.classList.add("d-none");
            const selVal = reasonSelect.value;

            if (!selVal) {
                otherContainer.style.display = "none";
                btnConfirm.disabled = true;
                return;
            }

            if (selVal === "other") {
                otherContainer.style.display = "block";
                const customVal = otherInput.value.trim();
                const rawLen = otherInput.value.length;
                charCount.textContent = `${rawLen}/20`;

                if (rawLen < 8) {
                    btnConfirm.disabled = true;
                    feedback.className = "text-danger";
                    feedback.textContent = `Too short! Minimum 8 characters required (${8 - rawLen} more needed).`;
                } else if (rawLen > 20) {
                    btnConfirm.disabled = true;
                    feedback.className = "text-danger";
                    feedback.textContent = "Too long! Maximum 20 characters allowed.";
                } else {
                    btnConfirm.disabled = false;
                    feedback.className = "text-success";
                    feedback.textContent = `Valid reason length (${rawLen}/20).`;
                }
            } else {
                otherContainer.style.display = "none";
                btnConfirm.disabled = false;
            }
        }

        reasonSelect.addEventListener("change", function () {
            validateReason();
            if (this.value === "other") {
                setTimeout(() => otherInput.focus(), 100);
            }
        });

        otherInput.addEventListener("input", validateReason);

        btnConfirm.addEventListener("click", async function () {
            if (!currentCancelOrderId) return;

            let finalReason = "";
            const selVal = reasonSelect.value;

            if (selVal === "other") {
                finalReason = otherInput.value.trim();
                if (finalReason.length < 8 || finalReason.length > 20) {
                    alertBox.textContent = "Reason must be between 8 and 20 characters.";
                    alertBox.classList.remove("d-none");
                    return;
                }
            } else if (selVal) {
                finalReason = selVal;
            } else {
                alertBox.textContent = "Please select a cancellation reason.";
                alertBox.classList.remove("d-none");
                return;
            }

            btnConfirm.disabled = true;
            btnConfirm.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Cancelling...';

            try {
                const res = await fetch(`${API_SHOP}/orders/${currentCancelOrderId}/cancel`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
                    body: JSON.stringify({ reason: finalReason })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    const bsModal = bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();

                    alert(data.message || `Order #${currentCancelOrderId} has been cancelled successfully.`);
                    await loadTransactions();
                    await loadCatalog();
                    await loadCart();
                } else {
                    alertBox.textContent = data.message || "Failed to cancel order.";
                    alertBox.classList.remove("d-none");
                    btnConfirm.disabled = false;
                    btnConfirm.innerHTML = '<i class="ti-close me-1"></i> Confirm Cancellation';
                }
            } catch (err) {
                console.error("Cancel order error:", err);
                alertBox.textContent = "An unexpected error occurred. Please try again.";
                alertBox.classList.remove("d-none");
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = '<i class="ti-close me-1"></i> Confirm Cancellation';
            }
        });
    }

    function openCancelOrderModal(orderId) {
        currentCancelOrderId = orderId;
        ensureCancelModalExists();
        initCancelModalEvents();

        const modalEl = document.getElementById("userCancelOrderModal");
        const orderIdSpan = document.getElementById("cancelModalOrderId");
        const reasonSelect = document.getElementById("cancelReasonSelect");
        const otherContainer = document.getElementById("cancelOtherReasonContainer");
        const otherInput = document.getElementById("cancelOtherReasonInput");
        const charCount = document.getElementById("cancelCharCount");
        const feedback = document.getElementById("cancelReasonFeedback");
        const btnConfirm = document.getElementById("btnConfirmCancelOrder");
        const alertBox = document.getElementById("cancelModalAlert");

        if (orderIdSpan) orderIdSpan.textContent = orderId;
        if (reasonSelect) reasonSelect.value = "";
        if (otherInput) otherInput.value = "";
        if (otherContainer) otherContainer.style.display = "none";
        if (charCount) charCount.textContent = "0/20";
        if (feedback) {
            feedback.className = "text-muted";
            feedback.textContent = "Must be between 8 and 20 characters.";
        }
        if (alertBox) {
            alertBox.textContent = "";
            alertBox.classList.add("d-none");
        }
        if (btnConfirm) {
            btnConfirm.disabled = true;
            btnConfirm.innerHTML = '<i class="ti-close me-1"></i> Confirm Cancellation';
        }

        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }

    // Expose for layout.js
    window.initializeUserDashboard = initUserDashboard;

    // Auto-init
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initUserDashboard);
    } else {
        initUserDashboard();
    }
})();
