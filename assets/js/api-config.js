(function () {
    "use strict";

    /**
     * ECOMS Central API Configuration
     * 
     * When running locally: Automatically points to http://localhost:3000/api
     * When published on Vercel: Points to your Render backend URL.
     * You can customize the DEFAULT_RENDER_API below, OR change it anytime without redeploying
     * by running in browser console: localStorage.setItem('ECOMS_API_URL', 'https://your-api.onrender.com/api')
     */
    const DEFAULT_RENDER_API = "https://ecoms-api-ajz5.onrender.com/api";

    const isLocal = Boolean(
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]" ||
        window.location.hostname.startsWith("192.168.") ||
        window.location.hostname.startsWith("10.")
    );

    const overrideUrl = localStorage.getItem("ECOMS_API_URL");

    let apiBase = "";
    if (overrideUrl && overrideUrl.trim()) {
        apiBase = overrideUrl.trim().replace(/\/+$/, "");
    } else if (isLocal) {
        const port = "3000";
        apiBase = `http://${window.location.hostname}:${port}/api`;
    } else {
        apiBase = DEFAULT_RENDER_API.replace(/\/+$/, "");
    }

    const backendHost = apiBase.replace(/\/api$/, "");

    window.ECOMS_CONFIG = {
        API_BASE: apiBase,
        BACKEND_HOST: backendHost,
        AUTH_URL: `${apiBase}/auth`,
        INVENTORY_URL: `${apiBase}/inventory`,
        SHOP_URL: `${apiBase}/shop`,
        ADMIN_URL: `${apiBase}/admin`,
        REPORTS_URL: `${apiBase}/reports`,
        USERS_URL: `${apiBase}/users`,
    };

    window.getEcomsApiUrl = function (path) {
        if (!path) return apiBase;
        return `${apiBase}/${path.replace(/^\//, "")}`;
    };

    window.getEcomsBackendHost = function () {
        return backendHost;
    };
})();
