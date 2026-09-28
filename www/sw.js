/**
 * Service Worker: sw.js
 * Sanatan Seva Samiti (SANATANAM) Digital ID & Core Offline Experience
 * 
 * Caches core HTML, CSS stylesheets, fonts, essential JS files,
 * and key media to ensure full offline availability of the Digital ID card.
 */

const CACHE_NAME = 'sss-core-cache-v1';

// Core assets to pre-cache immediately upon service worker install
const CORE_PRECACHE_URLS = [
    './id_card.html',
    './app_dashboard.html',
    './profile.html',
    './app_home.html',
    './welcome_flow.html',
    './welcome.html',
    './welcome_cache.js',
    './welcome_letter.html',
    './app_register.html',
    './style.css',
    './image_loader.js',
    './image_cache.js',
    './auth_guard.js',
    './common_nav.js',
    './footer_nav.js',
    './Images/jpg/logo.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://sanatansevasamiti.org/uploads/signature.jpg',
    'https://sanatansevasamiti.org/Images/jpg/logo.jpg'
];

// Install Event: Pre-cache core HTML, CSS, JS, and essential images
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing sw.js...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[ServiceWorker] Caching core HTML, CSS, JS & assets');
            // Cache individual items gracefully so one failing network resource does not abort installation
            await Promise.allSettled(
                CORE_PRECACHE_URLS.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn(`[ServiceWorker] Could not pre-cache: ${url}`, err);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: Clear outdated caches and take immediate control
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating sw.js...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing stale cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Cache-First for precached assets, Stale-While-Revalidate for updates & runtime resources
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only process HTTP/HTTPS GET requests
    if (request.method !== 'GET') {
        return;
    }

    if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
        return;
    }

    const url = new URL(request.url);

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version immediately, and update cache in background (Stale-While-Revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // Offline; background update failed silently
                });
                return cachedResponse;
            }

            // Not in cache: fetch from network and dynamically cache relevant resources
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Dynamically cache scripts, styles, fonts, images, and HTML documents
                    if (
                        request.destination === 'image' ||
                        request.destination === 'script' ||
                        request.destination === 'style' ||
                        request.destination === 'font' ||
                        request.destination === 'document' ||
                        url.pathname.endsWith('.html') ||
                        url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.png') ||
                        url.hostname.includes('sanatansevasamiti.org') ||
                        url.hostname.includes('qrserver.com') ||
                        url.hostname.includes('fonts.gstatic.com') ||
                        url.hostname.includes('cdnjs.cloudflare.com')
                    ) {
                        cache.put(request, responseClone);
                    }
                });

                return networkResponse;
            }).catch((error) => {
                console.warn('[ServiceWorker] Network request failed for:', request.url, error);
                return cachedResponse || Promise.reject(error);
            });
        })
    );
});
