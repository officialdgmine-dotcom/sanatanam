(function() {
    // 1. Check current page - Welcome, Login, Register पेजों पर नहीं दिखेगा
    const currentPath = window.location.pathname.toLowerCase();
    const isExcluded = currentPath.includes("welcome_flow") || 
                       currentPath.includes("app_login") || 
                       currentPath.includes("app_register");

    if (isExcluded) {
        return; // इन पेजों पर एग्जिट कर जाएगा
    }

    // Check if already injected
    if (document.getElementById("sss-nav")) {
        return;
    }

    // 2. Inject Mobile-Optimized CSS
    const style = document.createElement("style");
    style.id = "sss-nav-style";
    style.innerHTML = `
        body { 
            padding-bottom: calc(75px + env(safe-area-inset-bottom, 15px)) !important; 
        }

        #sss-nav {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: calc(68px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: linear-gradient(180deg, #ff4500 0%, #800000 100%);
            display: flex;
            justify-content: space-around;
            align-items: center;
            border-top: 3.5px solid #ffcc00;
            border-radius: 24px 24px 0 0;
            z-index: 999999;
            box-shadow: 0 -8px 25px rgba(0, 0, 0, 0.4);
            user-select: none;
            -webkit-user-select: none;
        }

        .sss-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #ffffff;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: 0.3px;
            transition: transform 0.15s ease;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
        }

        .sss-item img {
            width: 25px;
            height: 25px;
            display: block;
            margin-bottom: 3px;
            border-radius: 6px;
            object-fit: cover;
        }

        .sss-dash-wrap {
            margin-top: -30px;
            flex: 1;
            display: flex;
            justify-content: center;
        }

        .sss-gold-circle {
            width: 58px;
            height: 58px;
            background: linear-gradient(135deg, #ffd700 0%, #ffaa00 50%, #b8860b 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3.5px solid #800000;
            box-shadow: 0 4px 16px rgba(255, 215, 0, 0.6), 0 6px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .sss-gold-circle img {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            margin-bottom: 0 !important;
            object-fit: cover;
        }

        .sss-item:active {
            transform: scale(0.92);
        }

        .sss-gold-circle:active {
            transform: scale(0.92);
        }
    `;
    document.head.appendChild(style);

    // 3. Inject Mobile Footer HTML (Pure Local Asset Navigation)
    const navContainer = document.createElement("div");
    navContainer.id = "sss-nav";
    navContainer.innerHTML = `
        <a href="app_home.html" class="sss-item">
            <img src="https://sanatansevasamiti.org/uploads/footer/1780341771file_00000000145071fab7ea2e7e30f9dfaa-e1776295057951.png" alt="गृह">
            <span>गृह</span>
        </a>

        <a href="javascript:void(0);" onclick="if(window.showAppNotice){window.showAppNotice('गुरु परंपरा');}else{alert('गुरु परंपरा — यह अनुभाग शीघ्र ही स्थानीय रूप से उपलब्ध होगा।');}" class="sss-item">
            <img src="https://sanatansevasamiti.org/uploads/footer/1780341317ci.jpg" alt="गुरु परंपरा">
            <span>गुरु परंपरा</span>
        </a>

        <a href="feed.html" class="sss-item sss-dash-wrap">
            <div class="sss-gold-circle">
                <img src="https://sanatansevasamiti.org/uploads/footer/1780341218logo.jpg" alt="फीड">
            </div>
        </a>

        <a href="javascript:void(0);" onclick="if(window.showAppNotice){window.showAppNotice('सनातन पुस्तक संग्रह');}else{alert('पुस्तकें — यह अनुभाग शीघ्र ही स्थानीय रूप से उपलब्ध होगा।');}" class="sss-item">
            <img src="https://sanatansevasamiti.org/uploads/footer/1780341270bi.jpg" alt="पुस्तकें">
            <span>पुस्तकें</span>
        </a>

        <a href="app_dashboard.html" class="sss-item">
            <img src="https://sanatansevasamiti.org/uploads/footer/1780341144ai.jpg" alt="अकाउंट">
            <span>अकाउंट</span>
        </a>
    `;

    function injectNav() {
        if (document.body && !document.getElementById("sss-nav")) {
            document.body.appendChild(navContainer);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectNav);
    } else {
        injectNav();
    }
})();
