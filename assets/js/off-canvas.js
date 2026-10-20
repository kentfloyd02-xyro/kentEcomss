(function ($) {
    "use strict";
    $(function () {
        // Toggle mobile sidebar
        $(document).on("click", '[data-toggle="offcanvas"], [data-bs-toggle="offcanvas"]', function () {
            $(".sidebar-offcanvas").toggleClass("active");
            $("body").toggleClass("sidebar-mobile-open");
        });

        // Toggle desktop sidebar icon-only minimize
        $(document).on("click", '[data-toggle="minimize"], [data-bs-toggle="minimize"]', function () {
            $("body").toggleClass("sidebar-icon-only");
        });

        // Close sidebar when clicking a link on mobile (excluding sub-menu toggles)
        $(document).on("click", ".sidebar-offcanvas .nav-link:not([data-bs-toggle='collapse'])", function () {
            if (window.matchMedia("(max-width: 991px)").matches) {
                $(".sidebar-offcanvas").removeClass("active");
                $("body").removeClass("sidebar-mobile-open");
            }
        });

        // Close mobile sidebar when clicking backdrop / outside
        $(document).on("click", function (e) {
            if (window.matchMedia("(max-width: 991px)").matches) {
                const $target = $(e.target);
                if (!$target.closest(".sidebar-offcanvas, [data-toggle='offcanvas'], [data-bs-toggle='offcanvas']").length) {
                    if ($(".sidebar-offcanvas").hasClass("active")) {
                        $(".sidebar-offcanvas").removeClass("active");
                        $("body").removeClass("sidebar-mobile-open");
                    }
                }
            }
        });
    });
})(jQuery);
