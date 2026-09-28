/**
 * SANATANAM Welcome Flow High-Performance Local Cache Engine
 * Zero-latency local caching for welcome content, sacred mantras,
 * multilingual translations, and visual media (IndexedDB + LocalStorage).
 * Ensures instant responsiveness even on slow 2G/3G or offline connections.
 */

(function (window) {
    'use strict';

    const DB_NAME = 'sanatanam_welcome_cache_db';
    const DB_VERSION = 1;
    const STORE_ASSETS = 'welcome_assets';
    const CACHE_CONTENT_KEY = 'sanatanam_welcome_content_v1';
    const CACHE_TRANS_KEY = 'sanatanam_welcome_trans_cache_v1';
    const CACHE_STEP_KEY = 'sanatanam_welcome_step';

    // Default static fallback content
    const DEFAULT_WELCOME_CONTENT = {
        step1Eyebrow: "Welcome",
        welcomeTitle: "Enter the World of SANATANAM",
        welcomeDesc: "A modern spiritual platform bringing Sanatana wisdom, devotion, knowledge and tradition together in one beautiful experience.",
        step2Eyebrow: "Divine Blessings",
        divineMantra: "॥ ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ॥",
        divineTitle: "Divine Blessings",
        divineDesc: "May divine grace illuminate your path, strengthen your faith and bring peace, wisdom and positive energy into your life.",
        step3Eyebrow: "Personalize Your Experience",
        langTitle: "Language",
        langDesc: "Select the language you would like to use throughout your SANATANAM experience.",
        step4Eyebrow: "Your Journey Begins",
        memberTitle: "Welcome to SANATANAM",
        memberDesc: "Create your account or continue with your existing SANATANAM membership.",
        statsText: "1,25,000+ सक्रिय सनातन सेवक • 16+ प्रमुख सेवा प्रकल्प",
        version: "1.2.0",
        cachedAt: Date.now()
    };

    // Pre-cached rich multilingual translations for instant responsiveness
    const BUILTIN_TRANSLATIONS = {
        en: {
            step1Eyebrow: "Welcome",
            welcomeTitle: "Enter the World of <span class=\"gold-title\">SANATANAM</span>",
            welcomeDesc: "A modern spiritual platform bringing Sanatana wisdom, devotion, knowledge and tradition together in one beautiful experience.",
            step2Eyebrow: "Divine Blessings",
            divineMantra: "॥ ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ॥",
            divineTitle: "Divine Blessings",
            divineDesc: "May divine grace illuminate your path, strengthen your faith and bring peace, wisdom and positive energy into your life.",
            step3Eyebrow: "Personalize Your Experience",
            langTitle: "Language",
            langDesc: "Select the language you would like to use throughout your SANATANAM experience.",
            quickTitle: "Popular Languages",
            step4Eyebrow: "Your Journey Begins",
            memberTitle: "Welcome to <span class=\"gold-title\">SANATANAM</span>",
            memberDesc: "Create your account or continue with your existing SANATANAM membership.",
            btnRegister: "Create New Account",
            btnLogin: "Sign In",
            statsText: "1,25,000+ Active Sanatan Sevaks • 16+ Divine Seva Missions",
            continueBtn: "Continue",
            getStartedBtn: "Get Started"
        },
        hi: {
            step1Eyebrow: "स्वागतम्",
            welcomeTitle: "<span class=\"gold-title\">सनातनम्</span> की पावन दुनिया में प्रवेश करें",
            welcomeDesc: "सनातन ज्ञान, भक्ति, संस्कृति और सेवा परंपरा को एक सुंदर डिजिटल अनुभव में एक साथ अनुभव करें।",
            step2Eyebrow: "दिव्य आशीर्वाद",
            divineMantra: "॥ ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ॥",
            divineTitle: "दिव्य आशीर्वाद",
            divineDesc: "राज राजेश्वरी माँ भगवती की असीम अनुकंपा और कृपा सदा आप और आपके परिवार पर बनी रहे।",
            step3Eyebrow: "भाषा प्राथमिकता",
            langTitle: "भाषा",
            langDesc: "एप्लिकेशन का उपयोग करने के लिए अपनी पसंदीदा भाषा चुनें।",
            quickTitle: "त्वरित चयन",
            step4Eyebrow: "पावन यात्रा",
            memberTitle: "<span class=\"gold-title\">सनातनम्</span> में आपका स्वागत है",
            memberDesc: "सनातन धर्म के पावन मिशन से जुड़ें। अपना डिजिटल परिचय पत्र प्राप्त करें और सेवा से जुड़ें।",
            btnRegister: "नया पंजीकरण",
            btnLogin: "सदस्य लॉगिन",
            statsText: "1,25,000+ सक्रिय सनातन सेवक • 16+ प्रमुख सेवा प्रकल्प",
            continueBtn: "आगे बढ़ें",
            getStartedBtn: "आरंभ करें"
        },
        sa: {
            step1Eyebrow: "स्वागतम्",
            welcomeTitle: "<span class=\"gold-title\">सनातनम्</span> पावनलोके प्रवेश्यताम्",
            welcomeDesc: "सनातनज्ञानं भक्तिं संस्कृतिं परम्परां च एकस्मिन् सुन्दरानुभवे अनुभवन्तु।",
            step2Eyebrow: "दिव्याशीर्वादाः",
            divineMantra: "॥ ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ॥",
            divineTitle: "दिव्याशीर्वादाः",
            divineDesc: "भगवत्याः असीमकृपा भवत्सु भवतां परिवारेषु च सन्ततं तिष्ठतु।",
            step3Eyebrow: "भाषा चयनम्",
            langTitle: "भाषा",
            langDesc: "अनुप्रयोगस्य प्रयोगार्थं स्वाभीष्टभाषां वृणुताम्।",
            quickTitle: "प्रमुखाः भाषाः",
            step4Eyebrow: "पावनयात्रा",
            memberTitle: "<span class=\"gold-title\">सनातनम्</span> मध्ये स्वागतम्",
            memberDesc: "सनातनधर्मस्य पवित्रकार्ये सम्मिलिताः भवन्तु। स्वाभासीयं परिचयपत्रं प्राप्नुवन्तु।",
            btnRegister: "नूतनपञ्जीकरणम्",
            btnLogin: "सदस्यप्रवेशः",
            statsText: "1,25,000+ सक्रियाः सनातनसेवकाः • 16+ सेवाप्रकल्पाः",
            continueBtn: "अग्रिमम्",
            getStartedBtn: "प्रारभ्यताम्"
        },
        gu: {
            step1Eyebrow: "સ્વાગતમ્",
            welcomeTitle: "<span class=\"gold-title\">સનાતનમ્</span> ની પાવન દુનિયામાં સ્વાગત",
            welcomeDesc: "સનાતન જ્ઞાન, ભક્તિ, સંસ્કૃતિ અને સેવા પરંપરાનો અદભૂત ડિજિટલ અનુભવ.",
            step2Eyebrow: "દિવ્ય આશીર્વાદ",
            divineMantra: "॥ ૐ ઐં હ્રીં ક્લીં ચામુંડાયૈ વિચ્ચે ॥",
            divineTitle: "દિવ્ય આશીર્વાદ",
            divineDesc: "માઁ ભગવતીની અસીમ કૃપા સદા તમારા અને તમારા પરિવાર પર રહે.",
            step3Eyebrow: "ભાષા પસંદગી",
            langTitle: "ભાષા",
            langDesc: "તમારી મનપસંદ ભાષા પસંદ કરો.",
            quickTitle: "લોકપ્રિય ભાષાઓ",
            step4Eyebrow: "પવિત્ર યાત્રા",
            memberTitle: "<span class=\"gold-title\">સનાતનમ્</span> માં સ્વાગત છે",
            memberDesc: "સનાતન સેવા સમિતિ સાથે જોડાઈને ડિજિટલ પરિચય પત્ર મેળવો.",
            btnRegister: "નવું ખાતું બનાવો",
            btnLogin: "સાઇન ઇન",
            statsText: "1,25,000+ સક્રિય સનાતન સેવકો • 16+ સેવા પ્રોજેક્ટ",
            continueBtn: "આગળ વધો",
            getStartedBtn: "શરૂ કરો"
        },
        mr: {
            step1Eyebrow: "स्वागतम्",
            welcomeTitle: "<span class=\"gold-title\">सनातनम्</span> च्या पावन जगात आपले स्वागत",
            welcomeDesc: "सनातन ज्ञान, भक्ती, संस्कृती आणि सेवा परंपरेचा अद्वितीय डिजिटल अनुभव.",
            step2Eyebrow: "दिव्य आशीर्वाद",
            divineMantra: "॥ ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे ॥",
            divineTitle: "दिव्य आशीर्वाद",
            divineDesc: "माता भगवतीची असीम कृपा सदैव आपल्यावर आणि आपल्या कुटुंबावर राहो.",
            step3Eyebrow: "भाषा निवडा",
            langTitle: "भाषा",
            langDesc: "अॅप वापरण्यासाठी आपली आवडती भाषा निवडा.",
            quickTitle: "लोकप्रिय भाषा",
            step4Eyebrow: "पवित्र प्रवास",
            memberTitle: "<span class=\"gold-title\">सनातनम्</span> मध्ये आपले स्वागत",
            memberDesc: "सनातन सेवा समितीशी जोडून आपले डिजिटल ओळखपत्र मिळवा.",
            btnRegister: "नवीन खाते तयार करा",
            btnLogin: "साइन इन",
            statsText: "1,25,000+ सक्रिय सनातन सेवक • 16+ सेवा प्रकल्प",
            continueBtn: "पुढे जा",
            getStartedBtn: "सुरू करा"
        },
        bn: {
            step1Eyebrow: "স্বাগতম",
            welcomeTitle: "<span class=\"gold-title\">সনাতনম্</span> এর পুণ্য জগতে স্বাগতম",
            welcomeDesc: "সনাতন জ্ঞান, ভক্তি, সংস্কৃতি এবং সেবা ঐতিহ্যের এক মনোরম ডিজিটাল অভিজ্ঞতা।",
            step2Eyebrow: "দিব্য আশীর্বাদ",
            divineMantra: "॥ ॐ ঐং হ্রীং ক্লীং চামুণ্ডায়ৈ বিচ্চে ॥",
            divineTitle: "দিব্য আশীর্বাদ",
            divineDesc: "মা ভগবতীর অসীম কৃপা সর্বদা আপনার ও আপনার পরিবারের উপর বর্ষিত হোক।",
            step3Eyebrow: "ভাষা নির্বাচন",
            langTitle: "ভাষা",
            langDesc: "আপনার পছন্দের ভাষা নির্বাচন করুন।",
            quickTitle: "জনপ্রিয় ভাষা",
            step4Eyebrow: "পুণ্য যাত্রা",
            memberTitle: "<span class=\"gold-title\">সনাতনম্</span> এ স্বাগতম",
            memberDesc: "সনাতন সেবা সমিতির সাথে যুক্ত হন এবং ডিজিটাল পরিচয়পত্র পান।",
            btnRegister: "নতুন অ্যাকাউন্ট তৈরি করুন",
            btnLogin: "সাইন ইন",
            statsText: "১,২৫,০০০+ সক্রিয় সনাতন সেবক • ১৬+ সেবা মিশন",
            continueBtn: "এগিয়ে যান",
            getStartedBtn: "শুরু করুন"
        },
        ta: {
            step1Eyebrow: "நல்வரவு",
            welcomeTitle: "<span class=\"gold-title\">சனாதனம்</span> திருவுலகிற்கு வருக",
            welcomeDesc: "சனாதன ஞானம், பக்தி, கலாச்சாரம் மற்றும் சேவையின் ஆன்மீக அனுபவம்.",
            step2Eyebrow: "தெய்வீக ஆசிகள்",
            divineMantra: "॥ ஓம் ஐம் ஹ்ரீம் க்லீம் சாமுண்டாயை விச்சே ॥",
            divineTitle: "தெய்வீக ஆசிகள்",
            divineDesc: "அன்னை பகவதியின் திருவருள் என்றும் உங்கள் குடும்பத்தில் நிறையட்டும்.",
            step3Eyebrow: "மொழியைத் தேர்வு செய்க",
            langTitle: "மொழி",
            langDesc: "உங்கள் பயன்பாட்டுக்கான மொழியைத் தேர்ந்தெடுக்கவும்.",
            quickTitle: "பிரபல மொழிகள்",
            step4Eyebrow: "புனிதப் பயணம்",
            memberTitle: "<span class=\"gold-title\">சனாதனம்</span> உங்களை வரவேற்கிறது",
            memberDesc: "சனாதன சேவா சமிதியுடன் இணைந்து உங்கள் டிஜிட்டல் அடையாள அட்டையைப் பெறுங்கள்.",
            btnRegister: "புதிய கணக்கு தொடங்குக",
            btnLogin: "உள்நுழைக",
            statsText: "1,25,000+ தொண்டர்கள் • 16+ சேவைத் திட்டங்கள்",
            continueBtn: "தொடர்க",
            getStartedBtn: "தொடங்குக"
        },
        te: {
            step1Eyebrow: "స్వాగతం",
            welcomeTitle: "<span class=\"gold-title\">సనాతనమ్</span> పవిత్ర లోకానికి స్వాగతం",
            welcomeDesc: "సనాతన జ్ఞానం, భక్తి, సంస్కృతి మరియు సేవా పరంపర యొక్క దివ్య డిజిటల్ అనుభవం.",
            step2Eyebrow: "దివ్య ఆశీస్సులు",
            divineMantra: "॥ ఓం ఐం హ్రీం క్లీం చాముండాయై విచ్చే ॥",
            divineTitle: "దివ్య ఆశీస్సులు",
            divineDesc: "మాతా భగవతి అనుగ్రహం ఎల్లప్పుడూ మీపై, మీ కుటుంబంపై ఉండాలని ప్రార్థన.",
            step3Eyebrow: "భాష ఎంపిక",
            langTitle: "భాష",
            langDesc: "యాప్ వినియోగం కోసం మీ ప్రాధాన్యత గల భాషను ఎంచుకోండి.",
            quickTitle: "ప్రముఖ భాషలు",
            step4Eyebrow: "పవిత్ర ప్రయాణం",
            memberTitle: "<span class=\"gold-title\">సనాతనమ్</span> కి స్వాగతం",
            memberDesc: "సనాతన సేవా సమితిలో చేరి డిజిటల్ గుర్తింపు కార్డును పొందండి.",
            btnRegister: "కొత్త ఖాతా తెరవండి",
            btnLogin: "సైన్ ఇన్",
            statsText: "1,25,000+ సనాతన సేవకులు • 16+ సేవా ప్రాజెక్టులు",
            continueBtn: "కొనసాగించండి",
            getStartedBtn: "ప్రారంభించండి"
        }
    };

    // Open IndexedDB instance safely
    function openDB() {
        return new Promise((resolve) => {
            if (!window.indexedDB) return resolve(null);
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_ASSETS)) {
                        db.createObjectStore(STORE_ASSETS);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    }

    const WelcomeCacheEngine = {
        // Fast synchronous check from LocalStorage
        getLocalContent: function () {
            try {
                const raw = localStorage.getItem(CACHE_CONTENT_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    return Object.assign({}, DEFAULT_WELCOME_CONTENT, parsed);
                }
            } catch (e) {}
            return DEFAULT_WELCOME_CONTENT;
        },

        saveLocalContent: function (content) {
            try {
                const merged = Object.assign({}, this.getLocalContent(), content, {
                    cachedAt: Date.now()
                });
                localStorage.setItem(CACHE_CONTENT_KEY, JSON.stringify(merged));
                return merged;
            } catch (e) {
                return content;
            }
        },

        // Multilingual translations cache
        getTranslations: function (langCode) {
            let userCached = {};
            try {
                const raw = localStorage.getItem(CACHE_TRANS_KEY);
                if (raw) userCached = JSON.parse(raw);
            } catch (e) {}

            if (userCached[langCode]) {
                return userCached[langCode];
            }
            if (BUILTIN_TRANSLATIONS[langCode]) {
                return BUILTIN_TRANSLATIONS[langCode];
            }
            return BUILTIN_TRANSLATIONS.en;
        },

        saveTranslation: function (langCode, dict) {
            try {
                const raw = localStorage.getItem(CACHE_TRANS_KEY);
                const current = raw ? JSON.parse(raw) : {};
                current[langCode] = Object.assign({}, current[langCode] || {}, dict);
                localStorage.setItem(CACHE_TRANS_KEY, JSON.stringify(current));
            } catch (e) {}
        },

        // IndexedDB Asset Storage (Zero-delay offline blobs/base64)
        getCachedAsset: async function (key) {
            const db = await openDB();
            if (!db) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_ASSETS, 'readonly');
                    const store = tx.objectStore(STORE_ASSETS);
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result || null);
                    req.onerror = () => resolve(null);
                } catch (e) {
                    resolve(null);
                }
            });
        },

        saveCachedAsset: async function (key, dataUrl) {
            const db = await openDB();
            if (!db || !dataUrl) return false;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(STORE_ASSETS, 'readwrite');
                    const store = tx.objectStore(STORE_ASSETS);
                    const req = store.put(dataUrl, key);
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => resolve(false);
                } catch (e) {
                    resolve(false);
                }
            });
        },

        // Fetch image in background and convert to Base64 for IndexedDB
        cacheRemoteImage: function (key, url) {
            if (!url) return;
            fetch(url, { cache: 'force-cache' })
                .then(res => {
                    if (!res.ok) throw new Error("fetch failed");
                    return res.blob();
                })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (reader.result) {
                            WelcomeCacheEngine.saveCachedAsset(key, reader.result);
                        }
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(() => {
                    // Silently fall back to bundled asset
                });
        },

        // Hydrate images with 0ms local cached data
        hydrateWelcomeImages: async function () {
            const logoImages = document.querySelectorAll('.brand-mark, .hero-logo, .member-logo');
            const divineImage = document.querySelector('.divine-image');

            // 1. Immediately ensure local bundled fallbacks are present so there is no layout jump
            logoImages.forEach(img => {
                if (!img.complete || img.naturalWidth === 0) {
                    img.onerror = () => { img.src = 'Images/jpg/logo.jpg'; };
                }
            });

            // 2. Check IndexedDB for cached logo
            const cachedLogo = await this.getCachedAsset('welcome_logo');
            if (cachedLogo) {
                logoImages.forEach(img => { img.src = cachedLogo; });
            } else {
                logoImages.forEach(img => { img.src = 'Images/jpg/logo.jpg'; });
            }

            // 3. Check IndexedDB for cached divine Maa image
            if (divineImage) {
                const cachedMaa = await this.getCachedAsset('welcome_maa');
                if (cachedMaa) {
                    divineImage.src = cachedMaa;
                } else {
                    divineImage.src = 'Images/sections/bhawani-sena.jpg';
                }
            }
        },

        // Apply cached text content instantly to DOM
        applyCachedContentToDOM: function (langCode) {
            const lang = langCode || localStorage.getItem("sanatanam_app_lang") || "en";
            const trans = this.getTranslations(lang);
            const content = this.getLocalContent();

            // Update i18n nodes
            document.querySelectorAll("[data-i18n]").forEach(el => {
                const key = el.getAttribute("data-i18n");
                if (trans[key]) {
                    el.innerHTML = trans[key];
                }
            });

            // Update specific dynamic placeholders if present
            const mantraEl = document.getElementById("welcomeMantra");
            if (mantraEl && (trans.divineMantra || content.divineMantra)) {
                mantraEl.textContent = trans.divineMantra || content.divineMantra;
            }

            const statsEl = document.getElementById("welcomeStatsText");
            if (statsEl && (trans.statsText || content.statsText)) {
                statsEl.textContent = trans.statsText || content.statsText;
            }
        },

        // Background sync: retrieves fresh content without stalling the UI
        syncFreshContent: function () {
            // Check network latency or slow connection
            const isSlow = (navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.saveData));
            const pill = document.getElementById("cacheStatusPill");
            if (pill && isSlow) {
                pill.style.display = "inline-flex";
            }

            // Asynchronously query server for fresh blessings, quotes, or updates with 2.5s abort timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);

            fetch('https://sanatansevasamiti.org/api/get_feed_posts.php', {
                signal: controller.signal
            })
            .then(res => res.json())
            .then(data => {
                clearTimeout(timeoutId);
                if (data && data.success && Array.isArray(data.posts) && data.posts.length > 0) {
                    const firstPost = data.posts[0];
                    if (firstPost && firstPost.content) {
                        const snippet = firstPost.content.replace(/<[^>]*>?/gm, '').trim().substring(0, 140);
                        if (snippet.length > 20) {
                            WelcomeCacheEngine.saveLocalContent({
                                freshSpiritualThought: snippet,
                                lastPostId: firstPost.id
                            });
                        }
                    }
                }
            })
            .catch(() => {
                // If offline or timeout, local cache keeps the app completely functional
                if (pill) {
                    pill.style.display = "inline-flex";
                }
            });
        },

        // Save last active step
        saveStep: function (step) {
            try {
                localStorage.setItem(CACHE_STEP_KEY, String(step));
            } catch (e) {}
        },

        getSavedStep: function () {
            try {
                const s = parseInt(localStorage.getItem(CACHE_STEP_KEY), 10);
                if (!isNaN(s) && s >= 1 && s <= 4) return s;
            } catch (e) {}
            return 1;
        }
    };

    // Register Service Worker for precached assets if supported
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('[WelcomeCache] ServiceWorker registered:', reg.scope);
                })
                .catch(() => {
                    // Running within standard file asset context
                });
        });
    }

    // Expose globally
    window.WelcomeCache = WelcomeCacheEngine;

})(window);
