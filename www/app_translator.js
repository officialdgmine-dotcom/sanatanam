/**
 * SANATANAM Global Language Engine
 * Auto-translates pages based on selected language
 */
(function() {
    const savedLang = localStorage.getItem("sanatanam_app_lang") || "en";
    
    // Auto-reset hook on logout
    window.handleSanatanamLogout = function() {
        try {
            localStorage.removeItem("sanatanam_app_lang");
            localStorage.removeItem("sss_user_data");
            localStorage.removeItem("sss_user_token");
            localStorage.removeItem("sss_wallet_balance");
            sessionStorage.clear();
        } catch(e) {}
        window.location.href = "welcome.html";
    };

    // Google Translate / Cloud Engine Adapter
    if (savedLang && savedLang !== "en") {
        document.documentElement.lang = savedLang;

        // Ensure translate anchor container exists
        const ensureTranslateContainer = () => {
            if (!document.getElementById("google_translate_element")) {
                const el = document.createElement("div");
                el.id = "google_translate_element";
                el.style.display = "none";
                (document.body || document.documentElement).appendChild(el);
            }
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", ensureTranslateContainer);
        } else {
            ensureTranslateContainer();
        }

        const script = document.createElement("script");
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateInit";
        document.head.appendChild(script);

        window.googleTranslateInit = function() {
            try {
                ensureTranslateContainer();
                new google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: savedLang,
                    autoDisplay: false
                }, 'google_translate_element');

                setTimeout(() => {
                    const select = document.querySelector(".goog-te-combo");
                    if (select) {
                        select.value = savedLang;
                        select.dispatchEvent(new Event("change"));
                    }
                }, 500);
            } catch(e) {
                console.log("Translator init notice:", e);
            }
        };
    }
})();
