// Auth guard script for SANATANAM App
(function() {
    try {
        const raw = localStorage.getItem("sss_user_data");
        const currentPage = window.location.pathname.split('/').pop() || "";
        
        // If user is on protected screen without authentication
        const protectedPages = ["home.html", "app_home.html", "app_dashboard.html", "app_wallet.html", "id_card.html"];
        const authPages = ["app_login.html", "app_register.html", "index.html"];

        if (protectedPages.includes(currentPage)) {
            if (!raw) {
                console.log("[AuthGuard] No session found. Redirecting to app_login.html");
                window.location.replace("app_login.html");
            }
        }
    } catch(e) {
        console.warn("[AuthGuard] Execution error handled gracefully:", e);
    }
})();
