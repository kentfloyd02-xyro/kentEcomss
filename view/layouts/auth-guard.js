(function() {
    "use strict";

    const API_HOST = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : (window.location.hostname || "localhost");
    const API_BASE_URL = (window.ECOMS_CONFIG && window.ECOMS_CONFIG.AUTH_URL) ||
        ((window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") ? `http://${API_HOST}:3000/api/auth` : "https://ecoms-api.onrender.com/api/auth");

    const currentPath = window.location.pathname;
    const currentFile = currentPath.split("/").pop().toLowerCase();

    function redirectToLogin() {
        localStorage.removeItem("ecoms_session_token");
        const loginUrl = new URL("../pages/login.html", window.location.href);
        sessionStorage.setItem("ecoms:allowed-public-route", loginUrl.pathname);
        window.location.replace(loginUrl.href);
    }

    window.ecomsAuthReady = (async function() {

        if (currentFile !== "main.html") {
            return true;
        }

        try {
            const token = localStorage.getItem("ecoms_session_token");
            const headers = {
                Accept: "application/json"
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/session`, {
                method: "GET",
                credentials: "include",
                headers: headers
            });

            const result = await response.json();

            console.log("SESSION CHECK:", result);

            if (
                response.ok &&
                result.success === true &&
                result.authenticated === true
            ) {
                console.log("ECOMS session valid.");
                if (result.user) {
                    localStorage.setItem("ecoms_user_role", result.user.role || "user");
                    localStorage.setItem("ecoms_username", result.user.username || "");
                }
                return true;
            }

            console.log("No valid ECOMS session.");

            redirectToLogin();

            return false;

        } catch (error) {
            console.error("Authentication check failed:", error);

            redirectToLogin();

            return false;
        }
    })();
})();