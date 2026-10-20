(function ($) {
    "use strict";

    $(function () {

        // ==========================================
        // SETTINGS PANEL
        // ==========================================

        $(".nav-settings").on("click", function () {
            $("#right-sidebar").toggleClass("open");
        });

        $(".settings-close").on("click", function () {
            $("#right-sidebar, #theme-settings").removeClass("open");
        });

        $("#settings-trigger").on("click", function () {
            $("#theme-settings").toggleClass("open");
        });


        // ==========================================
        // EXISTING THEME CLASSES
        // ==========================================

        var sidebar_classes =
            "sidebar-light sidebar-dark sidebar-brown";

        var navbar_classes =
            "navbar-white navbar-black navbar-brown";

        var footer_classes =
            "footer-white footer-black footer-brown";

        var main_panel_classes =
            "mainpanel-white mainpanel-black mainpanel-brown";


        // ==========================================
        // ONE THEME STORAGE
        // ==========================================

        var theme_key = "ecoms.theme";

        var theme_default = "white";

        var $body = $("body");


        // ==========================================
        // APPLY THEME
        // ==========================================

        function setTheme(theme) {

            // Remove old sidebar theme
            $body.removeClass(sidebar_classes);

            // Remove old navbar theme
            $(".navbar").removeClass(navbar_classes);

            // Remove old footer theme
            $(".footer").removeClass(footer_classes);

            // Remove old main panel theme
            $(".main-panel").removeClass(main_panel_classes);


            // ======================================
            // WHITE
            // ======================================

            if (theme === "white") {

                $body.addClass("sidebar-light");

                $(".navbar").addClass("navbar-white");

                $(".footer").addClass("footer-white");

                $(".main-panel").addClass("mainpanel-white");
            }


            // ======================================
            // BLACK
            // ======================================

            if (theme === "black") {

                $body.addClass("sidebar-dark");

                $(".navbar").addClass("navbar-black");

                $(".footer").addClass("footer-black");

                $(".main-panel").addClass("mainpanel-black");
            }


            // ======================================
            // BROWN
            // ======================================

            if (theme === "brown") {

                $body.addClass("sidebar-brown");

                $(".navbar").addClass("navbar-brown");

                $(".footer").addClass("footer-brown");

                $(".main-panel").addClass("mainpanel-brown");
            }
        }


        // ==========================================
        // SAVE
        // ==========================================

        function saveTheme(theme) {

            try {
                localStorage.setItem(theme_key, theme);
            } catch (error) {
                console.error("Theme save error:", error);
            }
        }


        // ==========================================
        // LOAD
        // ==========================================

        function loadTheme() {

            try {
                return localStorage.getItem(theme_key) || theme_default;
            } catch (error) {
                return theme_default;
            }
        }


        // ==========================================
        // SELECTED STATE
        // ==========================================

        function updateSelectedTheme(theme) {

            $(".sidebar-bg-options").removeClass("selected");

            if (theme === "white") {
                $("#sidebar-light-theme").addClass("selected");
            }

            if (theme === "black") {
                $("#sidebar-dark-theme").addClass("selected");
            }

            if (theme === "brown") {
                $("#sidebar-brown-theme").addClass("selected");
            }
        }


        // ==========================================
        // THEME CLICK
        // ==========================================

        $("#sidebar-light-theme").on("click", function () {

            setTheme("white");

            saveTheme("white");

            updateSelectedTheme("white");
        });


        $("#sidebar-dark-theme").on("click", function () {

            setTheme("black");

            saveTheme("black");

            updateSelectedTheme("black");
        });


        $("#sidebar-brown-theme").on("click", function () {

            setTheme("brown");

            saveTheme("brown");

            updateSelectedTheme("brown");
        });


        // ==========================================
        // APPLY SAVED THEME
        // ==========================================

        function applySavedTheme() {

            var theme = loadTheme();

            setTheme(theme);

            updateSelectedTheme(theme);
        }


        // ==========================================
        // WAIT FOR DYNAMIC NAVBAR / SIDEBAR / FOOTER
        // ==========================================

        function waitForLayout() {

            if (
                $(".navbar").length &&
                $("#sidebar").children().length &&
                $(".footer").length
            ) {

                applySavedTheme();

                return;
            }

            setTimeout(waitForLayout, 50);
        }


        waitForLayout();

    });

})(jQuery);