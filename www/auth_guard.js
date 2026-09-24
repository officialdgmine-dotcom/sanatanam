// Auth guard script for SANATANAM App
function checkAuth() {
    try {
        const userData = localStorage.getItem("sss_user_data");
        if (!userData) {
            window.location.replace("welcome.html");
            return false;
        }
        const u = JSON.parse(userData);
        if (!u || (!u.id && !u.unique_id)) {
            window.location.replace("welcome.html");
            return false;
        }
        return true;
    } catch (e) {
        window.location.replace("welcome.html");
        return false;
    }
}

// ग्लोबल लॉगआउट फंक्शन जो हर पेज से काम करेगा
function logoutUser() {
    try {
        localStorage.removeItem("sanatanam_app_lang");
        localStorage.removeItem("sss_user_token");
        localStorage.removeItem("sss_user_data");
        localStorage.removeItem("sss_wallet_balance");
        localStorage.removeItem("cached_feed_posts");
        localStorage.clear();
        sessionStorage.clear();
    } catch (e) {}
    // लॉगआउट के बाद सीधे वेलकम स्क्रीन पर भेजें (रीसेट टू इंग्लिश)
    window.location.replace("welcome.html");
}

// सुरक्षित कॉल ताकि पुराने कोड में handleLogout भी logoutUser को कॉल करे
function handleLogout() {
    if (confirm("क्या आप लॉगआउट करना चाहते हैं?")) {
        logoutUser();
    }
}

// संरक्षित पेजों पर तुरंत जांचें (सिवाय welcome और login पेजों के)
const currentPath = window.location.pathname.toLowerCase();
if (!currentPath.includes("welcome") && 
    !currentPath.includes("app_login") && 
    !currentPath.includes("register")) {
    checkAuth();
}
