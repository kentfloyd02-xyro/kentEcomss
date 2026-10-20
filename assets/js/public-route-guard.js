(function() {
    "use strict";

    const allowedRouteKey = "ecoms:allowed-public-route";
    const navigationEntry = performance.getEntriesByType("navigation")[0];
    const navigationType = navigationEntry ? navigationEntry.type : "navigate";
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split("/").pop().toLowerCase();
    const guardedFiles = ["home.html"];
    const landingUrl = new URL("../../", window.location.href);

    function allowNextNavigation(url) {
        const target = new URL(url, window.location.href);

        if (target.origin === window.location.origin) {
            sessionStorage.setItem(allowedRouteKey, target.pathname);
        }
    }

    window.ecomsAllowNextNavigation = allowNextNavigation;

    document.addEventListener("click", function(event) {
        const link = event.target instanceof Element ?
            event.target.closest("a[href]") :
            null;

        if (!link || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        const target = new URL(link.href, window.location.href);
        const targetFile = target.pathname.split("/").pop().toLowerCase();

        if (
            target.origin === window.location.origin &&
            ["home.html", "login.html", "register.html", "forgot-password.html"].includes(targetFile)
        ) {
            allowNextNavigation(target.href);
        }
    }, true);

    if (!guardedFiles.includes(currentFile)) {
        return;
    }

    document.documentElement.style.visibility = "hidden";

    const allowedPath = sessionStorage.getItem(allowedRouteKey);
    const arrivedThroughApp = allowedPath === currentPath;

    if (arrivedThroughApp) {
        sessionStorage.removeItem(allowedRouteKey);
    }

    if (arrivedThroughApp || navigationType === "reload" ||
        navigationType === "back_forward") {
        document.documentElement.style.visibility = "";
        return;
    }

    window.location.replace(landingUrl.href);
})();
