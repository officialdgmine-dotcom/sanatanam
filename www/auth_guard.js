// Auth guard script for SANATANAM App
function checkAuth() {
    try {
        const userData = localStorage.getItem("sss_user_data");
        if (!userData) {
            window.location.replace("welcome_flow.html");
            return false;
        }
        const u = JSON.parse(userData);
        if (!u || (!u.id && !u.unique_id)) {
            window.location.replace("welcome_flow.html");
            return false;
        }
        return true;
    } catch (e) {
        window.location.replace("welcome_flow.html");
        return false;
    }
}

// संपूर्ण लॉगआउट एवं सुरक्षित सेशन क्लीनर (100% डेटा आइसोलेशन)
function logoutUser() {
    try {
        // 0. ImageLoader मेमोरी कैश और इमेज टेक्सचर को WebView मेमोरी से 100% मुक्त करें
        if (window.ImageLoader && typeof window.ImageLoader.clearMemoryCache === 'function') {
            try {
                window.ImageLoader.clearMemoryCache();
            } catch (loaderErr) {
                console.warn("ImageLoader clear error:", loaderErr);
            }
        }

        // 1. IndexedDB इमेज व डेटा कैश को पूरी तरह डिलीट करें ताकि पुराने यूज़र का फोटो न दिखे
        if (window.indexedDB) {
            try {
                window.indexedDB.deleteDatabase("sanatanam_img_cache_db");
            } catch (dbErr) {
                console.warn("IndexedDB delete error:", dbErr);
            }
        }

        // 2. लोकल स्टोरेज से सभी व्यक्तिगत डेटा, वॉलेट, टोकन व मीट्रिक्स को डिलीट करें
        try {
            const keysToRemove = [
                "sss_user_token",
                "sss_user_data",
                "sss_wallet_balance",
                "sss_wallet_uid",
                "sss_user_metrics",
                "sss_metrics_uid",
                "sss_user_txns",
                "sss_txns_uid",
                "cached_feed_posts",
                "sanatanam_app_lang"
            ];
            keysToRemove.forEach(k => localStorage.removeItem(k));
            localStorage.clear();
            sessionStorage.clear();
        } catch (storageErr) {
            console.warn("Storage clear error:", storageErr);
        }

        // 3. नेटिव एंड्रॉइड वेबव्यू कुकीज़ और कैश को पूरी तरह साफ़ करें
        if (window.AndroidBridge && typeof window.AndroidBridge.clearUserSession === "function") {
            try {
                window.AndroidBridge.clearUserSession();
            } catch (bridgeErr) {}
        }
    } catch (e) {
        console.warn("Logout error:", e);
    }

    // 4. लॉगआउट के बाद सीधे वेलकम फ्लो स्क्रीन पर भेजें
    window.location.replace("welcome_flow.html");
}

// सुरक्षित पुष्टिकरण कॉल
function handleLogout() {
    if (confirm("क्या आप वाकई लॉगआउट करना चाहते हैं?")) {
        logoutUser();
    }
}

// संरक्षित पेजों पर तुरंत जांचें (सिवाय welcome और login पेजों के)
const currentPath = window.location.pathname.toLowerCase();
if (!currentPath.includes("welcome_flow") && 
    !currentPath.includes("app_login") && 
    !currentPath.includes("welcome.html") &&
    !currentPath.includes("splash") &&
    !currentPath.includes("register")) {
    checkAuth();
}
