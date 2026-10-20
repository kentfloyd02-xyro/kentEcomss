(function() {
    "use strict";

    // Dynamic backend origin: automatically uses the current hostname
    // (e.g. localhost, 127.0.0.1, or 192.168.x.x when accessed from another computer)
    const hostname = window.location.hostname || "localhost";
    const API_PORT = "3000";
    const API_BASE = `http://${hostname}:${API_PORT}/api`;

    window.ECOMS_CONFIG = {
        API_BASE: API_BASE,
        AUTH_URL: `${API_BASE}/auth`,
        INVENTORY_URL: `${API_BASE}/inventory`,
        SHOP_URL: `${API_BASE}/shop`,
        USERS_URL: `${API_BASE}/users`
    };
})();
