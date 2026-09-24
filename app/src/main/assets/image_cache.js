/**
 * Zero-Latency Offline Image Cache Engine (IndexedDB)
 * High-speed caching for all DPs, Covers, Post media, and UI assets.
 * 0-second instant load from local memory (Base64/Blob), stale-free background sync.
 */

const SSS_CACHE_DB = 'sanatanam_img_cache_db';
const SSS_CACHE_STORE = 'images';

// Local static mapping dictionary for instant offline resolution
const LOCAL_SS_MAP = {
    'PRO1781011341': { dp: 'Images/ss/PRO1781011341_dp.jpg', cover: 'Images/ss/PRO1781011341_cover.jpg' },
    'PRO1781285901': { dp: 'Images/ss/PRO1781285901_dp.jpg', cover: 'Images/ss/PRO1781285901_cover.jpg' },
    'PRO1781287765': { dp: 'Images/ss/PRO1781287765_dp.jpg', cover: 'Images/ss/PRO1781287765_cover.jpg' },
    'PRO1781288688': { dp: 'Images/ss/PRO1781288688_dp.jpg', cover: 'Images/ss/PRO1781288688_cover.jpg' },
    'PRO1781289469': { dp: 'Images/ss/PRO1781289469_dp.jpg', cover: 'Images/ss/PRO1781289469_cover.jpg' },
    'PRO1781367447': { dp: 'Images/ss/PRO1781367447_dp.jpg', cover: 'Images/ss/PRO1781367447_cover.jpg' },
    'PRO1781289610': { dp: 'Images/ss/PRO1781289610_dp.jpg', cover: 'Images/ss/PRO1781289610_cover.jpg' },
    'PRO1781290640': { dp: 'Images/ss/PRO1781290640_dp.jpg', cover: 'Images/ss/PRO1781290640_cover.jpg' },
    'PRO1781291019': { dp: 'Images/ss/PRO1781291019_dp.jpg', cover: 'Images/ss/PRO1781291019_cover.jpg' },
    'PRO1781313938': { dp: 'Images/ss/PRO1781313938_dp.jpg', cover: 'Images/ss/PRO1781313938_cover.jpg' },
    'PRO1781318323': { dp: 'Images/ss/PRO1781318323_dp.jpg', cover: 'Images/ss/PRO1781318323_cover.jpg' },
    'PRO1781368186': { dp: 'Images/ss/PRO1781368186_dp.jpg', cover: 'Images/ss/PRO1781368186_cover.jpg' },
    'PRO1781318500': { dp: 'Images/ss/PRO1781318500_dp.jpg', cover: 'Images/ss/PRO1781318500_cover.jpg' },
    'PRO1781319711': { dp: 'Images/ss/PRO1781319711_dp.jpg', cover: 'Images/ss/PRO1781319711_cover.jpg' }
};

function getDB() {
    return new Promise((resolve) => {
        try {
            if (!window.indexedDB) return resolve(null);
            const req = indexedDB.open(SSS_CACHE_DB, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(SSS_CACHE_STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

async function getOfflineImage(cacheKey, preferredLocalUrl, fallbackRemoteUrl) {
    // 1. स्थानीय एसेट प्राथमिकता
    if (preferredLocalUrl && !preferredLocalUrl.startsWith('http')) {
        return preferredLocalUrl;
    }

    const key = cacheKey || preferredLocalUrl || fallbackRemoteUrl;
    if (!key) return 'Images/jpg/logo.jpg';

    try {
        const db = await getDB();
        if (db) {
            const cachedData = await new Promise((res) => {
                const tx = db.transaction(SSS_CACHE_STORE, 'readonly');
                const store = tx.objectStore(SSS_CACHE_STORE);
                const req = store.get(key);
                req.onsuccess = () => res(req.result);
                req.onerror = () => res(null);
            });

            if (cachedData) {
                return cachedData; // 0 सेकंड में लोकल कैश से रिटर्न
            }
        }
    } catch(e) {}

    // 2. बैकग्राउंड में फ़ेच व लोकल सेव
    const targetUrl = fallbackRemoteUrl || preferredLocalUrl;
    if (targetUrl && targetUrl.startsWith('http')) {
        fetch(targetUrl)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const b64 = reader.result;
                    const db = await getDB();
                    if (db) {
                        const tx = db.transaction(SSS_CACHE_STORE, 'readwrite');
                        tx.objectStore(SSS_CACHE_STORE).put(b64, key);
                    }
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {});
    }

    return targetUrl || 'Images/jpg/logo.jpg';
}

/**
 * Helper to build media URL for user profile photo
 */
function getUserProfileMediaUrl(photoPath) {
    if (!photoPath) return "Images/jpg/logo.jpg";
    if (photoPath.startsWith("data:image/") || photoPath.startsWith("Images/")) return photoPath;
    
    for (const pid of Object.keys(LOCAL_SS_MAP)) {
        if (photoPath.includes(pid)) {
            return LOCAL_SS_MAP[pid].dp;
        }
    }
    
    if (photoPath.includes("get_media.php")) return photoPath;
    const cleanName = photoPath.replace(/^.*[\\\/]/, '').trim();
    if (!cleanName) return "Images/jpg/logo.jpg";
    return `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(cleanName)}`;
}

/**
 * Helper to build media URL for Kshetra DP
 */
function getKshetraDpMediaUrl(sevaKshetra) {
    const k = (sevaKshetra || "").trim();
    if (!k || k === 'PRO1781011172') {
        return "Images/jpg/logo.jpg";
    }
    if (LOCAL_SS_MAP[k] && LOCAL_SS_MAP[k].dp) {
        return LOCAL_SS_MAP[k].dp;
    }
    return `https://sanatansevasamiti.org/api/get_media.php?pid=${encodeURIComponent(k)}&type=dp`;
}

/**
 * Helper to build media URL for Cover Photo
 */
function getCoverMediaUrl(sevaKshetra, customCover) {
    if (customCover) {
        if (customCover.startsWith("data:image/") || customCover.startsWith("Images/") || customCover === "uploads/pc.jpg") {
            return customCover;
        }
        for (const pid of Object.keys(LOCAL_SS_MAP)) {
            if (customCover.includes(pid)) {
                return LOCAL_SS_MAP[pid].cover;
            }
        }
        if (customCover.startsWith("http")) return customCover;
        const cleanCover = customCover.replace(/^.*[\\\/]/, '').trim();
        if (cleanCover) return `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(cleanCover)}`;
    }
    const k = (sevaKshetra || "").trim();
    if (k && LOCAL_SS_MAP[k] && LOCAL_SS_MAP[k].cover) {
        return LOCAL_SS_MAP[k].cover;
    }
    return "uploads/pc.jpg";
}

/**
 * Pre-cache all essential images in background
 */
async function preCacheUserAssets(user) {
    if (!user) return;
    try {
        const promises = [];
        promises.push(getOfflineImage("samiti_main_logo", "Images/jpg/logo.jpg"));
        promises.push(getOfflineImage("samiti_signature", null, "https://sanatansevasamiti.org/uploads/signature.jpg"));

        if (user.profile_photo) {
            const userPhotoUrl = getUserProfileMediaUrl(user.profile_photo);
            promises.push(getOfflineImage("user_profile_dp", userPhotoUrl.startsWith("http") ? null : userPhotoUrl, userPhotoUrl));
        }

        const sevaKshetra = (user.seva_kshetra || "").trim();
        if (sevaKshetra) {
            const dpUrl = getKshetraDpMediaUrl(sevaKshetra);
            const coverUrl = getCoverMediaUrl(sevaKshetra, user.cover_photo);
            promises.push(getOfflineImage(`kshetra_dp_${sevaKshetra}`, dpUrl.startsWith("http") ? null : dpUrl, dpUrl));
            promises.push(getOfflineImage(`kshetra_cover_${sevaKshetra}`, coverUrl.startsWith("http") ? null : coverUrl, coverUrl));
        }

        await Promise.allSettled(promises);
    } catch (e) {
        console.warn("[ImageCache] Pre-caching notice:", e);
    }
}

// ऑटोमैटिक सभी <img> टैग्स को सुपरफ़ास्ट लोड कराने का ग्लोबल ऑब्ज़र्वर
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img[data-cache-key]').forEach(async (img) => {
        const key = img.getAttribute('data-cache-key');
        const fallback = img.getAttribute('data-fallback') || img.src;
        const fastSrc = await getOfflineImage(key, img.src, fallback);
        if (fastSrc) img.src = fastSrc;
    });

    // Auto-cache observer for remote images loaded across feeds/cards
    const optimizeImg = async (img) => {
        if (!img || img.dataset.cacheEngineChecked) return;
        img.dataset.cacheEngineChecked = "1";
        const key = img.getAttribute('data-cache-key') || img.src;
        const fallback = img.getAttribute('data-fallback') || img.src;
        if (key && fallback && fallback.startsWith('http')) {
            const fastSrc = await getOfflineImage(key, img.src.startsWith('http') ? null : img.src, fallback);
            if (fastSrc && fastSrc !== img.src) {
                img.src = fastSrc;
            }
        }
    };

    if ('MutationObserver' in window) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'IMG') {
                            optimizeImg(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('img').forEach(optimizeImg);
                        }
                    }
                });
            });
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
});

// Global exports
window.SSS_CACHE_DB = SSS_CACHE_DB;
window.SSS_CACHE_STORE = SSS_CACHE_STORE;
window.getDB = getDB;
window.getOfflineImage = getOfflineImage;
window.getUserProfileMediaUrl = getUserProfileMediaUrl;
window.getKshetraDpMediaUrl = getKshetraDpMediaUrl;
window.getCoverMediaUrl = getCoverMediaUrl;
window.preCacheUserAssets = preCacheUserAssets;
