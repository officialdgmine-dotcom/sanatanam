/**
 * Service Worker for Sanatan Seva Samiti Digital ID Card (id_card.html)
 * Caches CSS, JS dependencies, and core card images to ensure the ID card
 * remains completely viewable offline once visited.
 */

const CACHE_NAME = 'sss-idcard-cache-v1';

// Core assets to pre-cache immediately upon install
const PRECACHE_ASSETS = [
    './id_card.html',
    './image_cache.js',
    './Images/jpg/logo.jpg',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800;900&display=swap',
    'https://sanatansevasamiti.org/uploads/signature.jpg',
    'https://sanatansevasamiti.org/Images/jpg/logo.jpg'
];

// Install Event: Pre-cache static dependencies
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[ServiceWorker] Pre-caching core ID card offline dependencies');
            // Cache individual items gracefully so one failing network resource does not abort installation
            await Promise.allSettled(
                PRECACHE_ASSETS.map((url) =>
                    cache.add(url).catch((err) => {
                        console.warn(`[ServiceWorker] Could not pre-cache ${url}:`, err);
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// Activate Event: Clean up old caches and take immediate control
self.addEventListener('activate', (event) => {
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

// Fetch Event: Cache-first for core assets / Stale-While-Revalidate for images & network resources
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Don't intercept chrome-extension or uncacheable schemes
    if (!request.url.startsWith('http') && !request.url.startsWith('https')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // If it's cached, return cached copy and fetch update in background (Stale-While-Revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // Offline; silently ignore background refresh failure
                });
                return cachedResponse;
            }

            // If not in cache, fetch from network and dynamically store in cache
            return fetch(request).then((networkResponse) => {
                // Check if valid response
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Clone response to put into cache
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    // Cache images, scripts, fonts, and stylesheets dynamically
                    if (
                        request.destination === 'image' ||
                        request.destination === 'script' ||
                        request.destination === 'style' ||
                        request.destination === 'font' ||
                        url.pathname.endsWith('.html') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.png') ||
                        url.hostname.includes('sanatansevasamiti.org') ||
                        url.hostname.includes('qrserver.com') ||
                        url.hostname.includes('fonts.gstatic.com') ||
                        url.hostname.includes('cdnjs.cloudflare.com')
                    ) {
                        cache.put(request, responseToCache);
                    }
                });

                return networkResponse;
            }).catch((fetchErr) => {
                console.warn('[ServiceWorker] Fetch failed, resource unavailable offline:', request.url, fetchErr);
                // Return cached version if available as fallback
                return cachedResponse || Promise.reject(fetchErr);
            });
        })
    );
});
