/**
 * Offline-First Local Image Caching Engine
 * Caches images in localStorage as Base64 data URLs for instant zero-latency loading
 * and 100% offline rendering (including html2canvas exports and WebView sandbox).
 * 
 * Supports centralized Media Proxy API: api/get_media.php
 * - DP: https://sanatansevasamiti.org/api/get_media.php?file={filename}
 * - Kshetra DP: https://sanatansevasamiti.org/api/get_media.php?pid={seva_kshetra}&type=dp
 * - Cover: https://sanatansevasamiti.org/api/get_media.php?pid={seva_kshetra}&type=cover
 */

const IMAGE_CACHE_PREFIX = "cache_img_";

/**
 * Helper to build get_media.php URL for user profile photo
 * @param {string} photoPath 
 * @returns {string}
 */
function getUserProfileMediaUrl(photoPath) {
    if (!photoPath) return "https://sanatansevasamiti.org/Images/jpg/logo.jpg";
    if (photoPath.startsWith("data:image/")) return photoPath;

    // यदि पहले से ही get_media.php या पूरी URL है तो फ़ाइल का नाम निकालें या उपयोग करें
    if (photoPath.includes("get_media.php")) return photoPath;
    
    // फ़ाइलनेम एक्सट्रेक्ट करें
    const cleanName = photoPath.replace(/^.*[\\\/]/, '').trim();
    if (!cleanName) return "https://sanatansevasamiti.org/Images/jpg/logo.jpg";
    return `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(cleanName)}`;
}

/**
 * Helper to build get_media.php URL for Kshetra DP
 * @param {string} sevaKshetra 
 * @returns {string}
 */
function getKshetraDpMediaUrl(sevaKshetra) {
    const k = (sevaKshetra || "").trim();
    if (!k || k === 'PRO1781011172') {
        return "https://sanatansevasamiti.org/Images/jpg/logo.jpg";
    }
    return `https://sanatansevasamiti.org/api/get_media.php?pid=${encodeURIComponent(k)}&type=dp`;
}

/**
 * Helper to build get_media.php URL for Cover Photo
 * @param {string} sevaKshetra 
 * @param {string} customCover 
 * @returns {string}
 */
function getCoverMediaUrl(sevaKshetra, customCover) {
    if (customCover) {
        if (customCover.startsWith("data:image/") || customCover.includes("get_media.php")) return customCover;
        const cleanName = customCover.replace(/^.*[\\\/]/, '').trim();
        if (cleanName) {
            return `https://sanatansevasamiti.org/api/get_media.php?file=${encodeURIComponent(cleanName)}`;
        }
    }
    const k = (sevaKshetra || "").trim();
    if (k) {
        return `https://sanatansevasamiti.org/api/get_media.php?pid=${encodeURIComponent(k)}&type=cover`;
    }
    return "https://sanatansevasamiti.org/Images/jpg/logo.jpg";
}

/**
 * Retrieves an image as Base64 from local cache or fetches, converts, and saves it.
 * @param {string} key Unique identifier for the cached image
 * @param {string} remoteUrl URL to fetch if not cached
 * @returns {Promise<string>} Base64 data URL or original URL as fallback
 */
async function getOfflineImage(key, remoteUrl) {
    if (!remoteUrl) return "";

    // 1. यदि रिमोट URL पहले से ही Base64 डेटा है तो सीधे रिटर्न करें
    if (remoteUrl.startsWith("data:image/")) {
        return remoteUrl;
    }

    const storageKey = IMAGE_CACHE_PREFIX + key;

    // 2. लोकल स्टोरेज में पहले से सेव Base64 चेक करें (Instant 0-second offline return)
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached && cached.startsWith("data:image/")) {
            return cached;
        }
    } catch (e) {
        console.warn("[ImageCache] Storage read error:", e);
    }

    // 3. यदि कैश में नहीं है, तो रिमोट से फ़ेच करके Base64 में बदलें
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
                    console.warn("[ImageCache] LocalStorage quota exceeded or error:", quotaErr);
                }
                resolve(base64data);
            };
            reader.onerror = () => {
                resolve(remoteUrl);
            };
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        // नेटवर्क न होने या CORS एरर की स्थिति में फ़ॉलबैक
        console.warn(`[ImageCache] Could not pre-cache ${key}:`, err);
        return remoteUrl;
    }
}

/**
 * Pre-cache all essential images in background upon login or profile sync
 * @param {object} user User object containing seva_kshetra, profile_photo, etc.
 */
async function preCacheUserAssets(user) {
    if (!user) return;

    try {
        const promises = [];

        // 1. मुख्य समिति लोगो
        promises.push(
            getOfflineImage("samiti_main_logo", "https://sanatansevasamiti.org/Images/jpg/logo.jpg")
        );

        // 2. राष्ट्रीय अध्यक्ष हस्ताक्षर (आईडी कार्ड के लिए आवश्यक)
        promises.push(
            getOfflineImage("samiti_signature", "https://sanatansevasamiti.org/uploads/signature.jpg")
        );

        // 3. यूज़र प्रोफ़ाइल फोटो (via api/get_media.php)
        if (user.profile_photo) {
            const userPhotoUrl = getUserProfileMediaUrl(user.profile_photo);
            promises.push(getOfflineImage("user_profile_dp", userPhotoUrl));
        }

        // 4. सेवा क्षेत्र डीपी एवं कवर (via api/get_media.php)
        const sevaKshetra = (user.seva_kshetra || "").trim();
        if (sevaKshetra) {
            promises.push(
                getOfflineImage(
                    `kshetra_dp_${sevaKshetra}`,
                    getKshetraDpMediaUrl(sevaKshetra)
                )
            );
            promises.push(
                getOfflineImage(
                    `kshetra_cover_${sevaKshetra}`,
                    getCoverMediaUrl(sevaKshetra, user.cover_photo)
                )
            );
        } else if (user.cover_photo) {
            promises.push(getOfflineImage("user_cover_dp", getCoverMediaUrl("", user.cover_photo)));
        }

        await Promise.allSettled(promises);
        console.log("[ImageCache] Pre-caching with get_media.php completed successfully.");
    } catch (e) {
        console.warn("[ImageCache] Pre-caching batch error:", e);
    }
}
