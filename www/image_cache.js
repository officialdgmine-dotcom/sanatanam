/**
 * Offline-First Local Image Caching Engine
 * Pre-bundles and maps all Seva Kshetra DPs, Covers, and Sections locally.
 * Caches images in localStorage as Base64 data URLs for instant zero-latency loading
 * and 100% offline rendering (including html2canvas exports and WebView sandbox).
 */

const IMAGE_CACHE_PREFIX = "cache_img_";

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

/**
 * Helper to build media URL for user profile photo
 * @param {string} photoPath 
 * @returns {string}
 */
function getUserProfileMediaUrl(photoPath) {
    if (!photoPath) return "Images/jpg/logo.jpg";
    if (photoPath.startsWith("data:image/") || photoPath.startsWith("Images/")) return photoPath;
    
    // Check if photo matches any Seva Kshetra profile ID
    for (const pid of Object.keys(LOCAL_SS_MAP)) {
        if (photoPath.includes(pid)) {
            return LOCAL_SS_MAP[pid].dp;
        }
    }
    
    // If external URL or clean filename, fallback gracefully
    if (photoPath.includes("get_media.php")) return photoPath;
    const cleanName = photoPath.replace(/^.*[\\\/]/, '').trim();
    if (!cleanName) return "Images/jpg/logo.jpg";
    return `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(cleanName)}`;
}

/**
 * Helper to build media URL for Kshetra DP
 * @param {string} sevaKshetra 
 * @returns {string}
 */
function getKshetraDpMediaUrl(sevaKshetra) {
    const k = (sevaKshetra || "").trim();
    if (!k || k === 'PRO1781011172') {
        return "Images/jpg/logo.jpg";
    }
    // Local first match
    if (LOCAL_SS_MAP[k] && LOCAL_SS_MAP[k].dp) {
        return LOCAL_SS_MAP[k].dp;
    }
    return `https://sanatansevasamiti.org/api/get_media.php?pid=${encodeURIComponent(k)}&type=dp`;
}

/**
 * Helper to build media URL for Cover Photo
 * @param {string} sevaKshetra 
 * @param {string} customCover 
 * @returns {string}
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
 * Retrieves an image as Base64 from local cache or fetches, converts, and saves it.
 * @param {string} key Unique identifier for the cached image
 * @param {string} remoteUrl URL to fetch if not cached
 * @returns {Promise<string>} Base64 data URL or original URL as fallback
 */
async function getOfflineImage(key, remoteUrl) {
    if (!remoteUrl) return "";

    // 1. यदि रिलेटिव लोकल पाथ (Images/ या uploads/pc.jpg) या Base64 डेटा है
    if (remoteUrl.startsWith("data:image/") || remoteUrl.startsWith("Images/") || remoteUrl === "uploads/pc.jpg") {
        return remoteUrl;
    }

    if (remoteUrl.startsWith("uploads/")) {
        const clean = remoteUrl.replace(/^uploads\//, '').trim();
        remoteUrl = `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(clean)}`;
    }

    const storageKey = IMAGE_CACHE_PREFIX + key;

    // 2. लोकल स्टोरेज में पहले से सेव Base64 चेक करें
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached && cached.startsWith("data:image/")) {
            return cached;
        }
    } catch (e) {
        console.warn("[ImageCache] Storage read error:", e);
    }

    // 3. यदि कैश में नहीं है, तो फ़ेच करके Base64 में बदलें
    try {
        const response = await fetch(remoteUrl, { mode: "cors" });
        if (!response.ok) {
            throw new Error(`Fetch failed with status: ${response.status}`);
        }
        const blob = await response.blob();
        
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                try {
                    localStorage.setItem(storageKey, base64data);
                } catch (quotaErr) {
                    console.warn("[ImageCache] LocalStorage quota exceeded:", quotaErr);
                }
                resolve(base64data);
            };
            reader.onerror = () => {
                resolve(remoteUrl);
            };
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn(`[ImageCache] Could not pre-cache ${key}:`, err);
        return remoteUrl;
    }
}

/**
 * Pre-cache all essential images in background
 */
async function preCacheUserAssets(user) {
    if (!user) return;
    try {
        const promises = [];
        promises.push(getOfflineImage("samiti_main_logo", "Images/jpg/logo.jpg"));
        promises.push(getOfflineImage("samiti_signature", "https://sanatansevasamiti.org/uploads/signature.jpg"));

        if (user.profile_photo) {
            const userPhotoUrl = getUserProfileMediaUrl(user.profile_photo);
            promises.push(getOfflineImage("user_profile_dp", userPhotoUrl));
        }

        const sevaKshetra = (user.seva_kshetra || "").trim();
        if (sevaKshetra) {
            promises.push(getOfflineImage(`kshetra_dp_${sevaKshetra}`, getKshetraDpMediaUrl(sevaKshetra)));
            promises.push(getOfflineImage(`kshetra_cover_${sevaKshetra}`, getCoverMediaUrl(sevaKshetra, user.cover_photo)));
        }

        await Promise.allSettled(promises);
    } catch (e) {
        console.warn("[ImageCache] Pre-caching completed with notices:", e);
    }
}
