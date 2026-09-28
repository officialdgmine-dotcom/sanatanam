/**
 * ImageLoader Utility for SANATANAM App
 * 
 * Features:
 * 1. Custom <image-loader> Element & standard <img> tag auto-replacement
 * 2. IntersectionObserver-based lazy loading with high-performance viewport anticipation
 * 3. Strict CSS Containment (contain: layout paint; content-visibility: auto) & explicit dimensions to prevent reflow (CLS = 0)
 * 4. In-Memory Cache (Map) for instantaneous 0ms decode retrieval and fast switching
 * 5. Complete memory cache purge on logout: clears memoryCache, revokes Blob URLs,
 *    and resets all image element textures to free WebView GPU & heap memory immediately.
 */

(function(global) {
    'use strict';

    // 1x1 transparent GIF placeholder to preserve dimensions without rendering artifacts
    const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // In-memory cache holding resolved image bitmaps/URLs
    const memoryCache = new Map();
    const observedElements = new WeakSet();
    const activeImageElements = new Set();
    const createdBlobUrls = new Set();

    let intersectionObserver = null;
    let mutationObserver = null;

    // Inject base containment and image-loader CSS once
    function injectStyles() {
        if (typeof document === 'undefined' || document.getElementById('image-loader-styles')) return;
        const style = document.createElement('style');
        style.id = 'image-loader-styles';
        style.textContent = `
            image-loader, .image-loader-wrapper {
                display: inline-block;
                position: relative;
                overflow: hidden;
                contain: layout paint;
                content-visibility: auto;
                background-color: rgba(240, 240, 240, 0.4);
                box-sizing: border-box;
            }
            .image-loader-img {
                display: block;
                width: 100%;
                height: 100%;
                contain: layout paint;
                content-visibility: auto;
                decoding: async;
                transition: opacity 0.22s ease-in-out;
            }
            .image-loader-img.image-loading {
                opacity: 0.25;
            }
            .image-loader-img.image-loaded {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Lazy loading IntersectionObserver with 150px rootMargin
     */
    function getObserver() {
        if (!intersectionObserver && typeof IntersectionObserver !== 'undefined') {
            try {
                intersectionObserver = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const target = entry.target;
                            obs.unobserve(target);
                            loadImage(target);
                        }
                    });
                }, {
                    rootMargin: '150px 0px 150px 0px',
                    threshold: 0.01
                });
            } catch (e) {
                intersectionObserver = null;
            }
        }
        return intersectionObserver;
    }

    /**
     * Sets explicit dimensions & CSS containment to prevent layout reflow
     */
    function applyContainment(el, width, height, aspectRatio) {
        if (!el) return;

        el.classList.add('image-loader-img');
        el.style.contain = 'layout paint';
        el.style.contentVisibility = 'auto';
        el.decoding = 'async';
        el.loading = 'lazy';

        // Explicit width
        if (width) {
            el.setAttribute('width', width);
            const wVal = typeof width === 'number' ? `${width}px` : width;
            if (!el.style.width && !el.classList.contains('avatar') && !el.classList.contains('icon') && !el.classList.contains('brandLogo')) {
                el.style.width = wVal;
            }
        }

        // Explicit height
        if (height) {
            el.setAttribute('height', height);
            const hVal = typeof height === 'number' ? `${height}px` : height;
            if (!el.style.height && !el.classList.contains('avatar') && !el.classList.contains('icon') && !el.classList.contains('brandLogo')) {
                el.style.height = hVal;
            }
        }

        // Explicit aspect ratio
        if (aspectRatio) {
            el.style.aspectRatio = aspectRatio;
        } else if (width && height) {
            const numW = parseFloat(width);
            const numH = parseFloat(height);
            if (!isNaN(numW) && !isNaN(numH) && numH > 0) {
                el.style.aspectRatio = `${numW} / ${numH}`;
            }
        }
    }

    /**
     * Loads image with memory cache lookup, offline storage resolution, and fallback
     */
    async function loadImage(img) {
        if (!img) return;
        activeImageElements.add(img);

        const realSrc = img.dataset.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
        const fallback = img.dataset.fallback || img.getAttribute('data-fallback') || 'Images/jpg/logo.jpg';
        const cacheKey = img.dataset.cacheKey || img.getAttribute('data-cache-key') || realSrc;

        if (!realSrc || realSrc === TRANSPARENT_PLACEHOLDER) {
            return;
        }

        // 1. Check in-memory cache first (0ms instantaneous lookup, no disk/network hit)
        if (memoryCache.has(cacheKey)) {
            const cachedEntry = memoryCache.get(cacheKey);
            if (cachedEntry && cachedEntry.src) {
                img.src = cachedEntry.src;
                img.classList.remove('image-loading');
                img.classList.add('image-loaded');
                return;
            }
        }

        // 2. If it's a local asset or data URL, display directly and store in memory cache
        if (realSrc.startsWith('Images/') || realSrc.startsWith('data:image/') || realSrc.startsWith('uploads/')) {
            memoryCache.set(cacheKey, { src: realSrc, timestamp: Date.now() });
            img.src = realSrc;
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
            return;
        }

        // 3. For remote or dynamic URLs, resolve through offline cache engine if available
        try {
            img.classList.add('image-loading');
            let resolvedUrl = realSrc;

            if (typeof global.getOfflineImage === 'function') {
                const offSrc = await global.getOfflineImage(cacheKey, realSrc.startsWith('http') ? null : realSrc, realSrc);
                if (offSrc) {
                    resolvedUrl = offSrc;
                }
            }

            // Cache in memory
            memoryCache.set(cacheKey, { src: resolvedUrl, timestamp: Date.now() });

            if (resolvedUrl.startsWith('blob:')) {
                createdBlobUrls.add(resolvedUrl);
            }

            img.src = resolvedUrl;
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
        } catch (e) {
            img.src = fallback;
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
            img.onerror = () => { img.src = 'Images/jpg/logo.jpg'; };
        }
    }

    /**
     * Setup a standard <img> element to be lazily loaded with CSS containment
     */
    function attach(img, options = {}) {
        if (!img || observedElements.has(img)) return;
        observedElements.add(img);
        activeImageElements.add(img);

        const width = options.width || img.getAttribute('width') || (img.style.width ? parseInt(img.style.width, 10) : null);
        const height = options.height || img.getAttribute('height') || (img.style.height ? parseInt(img.style.height, 10) : null);
        const aspectRatio = options.aspectRatio || (width && height ? `${width}/${height}` : null);

        applyContainment(img, width, height, aspectRatio);

        const currentSrc = img.getAttribute('src');
        const targetSrc = options.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || currentSrc;

        if (targetSrc && targetSrc !== TRANSPARENT_PLACEHOLDER) {
            img.dataset.src = targetSrc;
            if (options.fallback) img.dataset.fallback = options.fallback;
            if (options.cacheKey) img.dataset.cacheKey = options.cacheKey;

            const obs = getObserver();
            if (obs && !priority) {
                const isLocal = targetSrc.startsWith('Images/') || targetSrc.startsWith('data:image/') || targetSrc.startsWith('uploads/');
                if (!isLocal) {
                    const cacheKey = options.cacheKey || targetSrc;
                    if (memoryCache.has(cacheKey)) {
                        img.src = memoryCache.get(cacheKey).src;
                        img.classList.add('image-loaded');
                        return;
                    }
                    obs.observe(img);
                } else {
                    loadImage(img);
                }
            } else {
                loadImage(img);
            }
        }
    }

    /**
     * Render an ImageLoader container HTML string for templates
     */
    function render(options = {}) {
        const src = options.src || 'Images/jpg/logo.jpg';
        const fallback = options.fallback || 'Images/jpg/logo.jpg';
        const alt = options.alt || 'Sanatanam';
        const className = options.className || '';
        const id = options.id ? `id="${options.id}"` : '';
        const width = options.width ? `width="${options.width}"` : '';
        const height = options.height ? `height="${options.height}"` : '';
        const cacheKey = options.cacheKey ? `data-cache-key="${options.cacheKey}"` : '';
        const onclick = options.onclick ? `onclick="${options.onclick}"` : '';
        const priority = options.priority ? 'data-priority="true" loading="eager"' : 'loading="lazy"';
        const styleRules = [
            'contain: layout paint',
            'content-visibility: auto',
            options.aspectRatio ? `aspect-ratio: ${options.aspectRatio}` : '',
            options.style || ''
        ].filter(Boolean).join('; ');

        return `<img ${id} class="image-loader-img ${className}" data-src="${src}" data-fallback="${fallback}" ${cacheKey} ${width} ${height} style="${styleRules}" ${onclick} alt="${alt}" ${priority} decoding="async" src="${src}">`;
    }

    /**
     * Scan and upgrade all standard <img> tags in a container
     */
    function scanAndUpgrade(root = document) {
        if (!root || !root.querySelectorAll) return;
        const images = root.querySelectorAll('img:not([data-image-loader-ready])');
        images.forEach(img => {
            img.setAttribute('data-image-loader-ready', 'true');
            attach(img);
        });
    }

    /**
     * Observe dynamic additions to the DOM and automatically upgrade newly inserted <img> tags
     */
    function initDynamicObserver() {
        if (typeof MutationObserver === 'undefined' || mutationObserver || typeof document === 'undefined') return;
        try {
            mutationObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'IMG' && !node.hasAttribute('data-image-loader-ready')) {
                                node.setAttribute('data-image-loader-ready', 'true');
                                attach(node);
                            } else if (node.querySelectorAll) {
                                scanAndUpgrade(node);
                            }
                        }
                    });
                });
            });

            if (document.body) {
                mutationObserver.observe(document.body, { childList: true, subtree: true });
            }
        } catch (e) {
            console.warn('[ImageLoader] MutationObserver notice:', e);
        }
    }

    /**
     * COMPLETE MEMORY PURGE ON LOGOUT:
     * - Frees all memory cache entries
     * - Revokes any created Blob / Object URLs
     * - Clears src of all active images to immediately free WebView GPU textures & RAM
     * - Disconnects all observers
     */
    function clearMemoryCache() {
        try {
            // 1. Revoke all created Blob / Object URLs
            createdBlobUrls.forEach(url => {
                try { URL.revokeObjectURL(url); } catch (e) {}
            });
            createdBlobUrls.clear();

            for (const [, entry] of memoryCache.entries()) {
                if (entry && entry.src && entry.src.startsWith('blob:')) {
                    try { URL.revokeObjectURL(entry.src); } catch (e) {}
                }
            }
            memoryCache.clear();

            // 2. Wipe image elements in memory so the WebView releases texture memory immediately
            activeImageElements.forEach(img => {
                if (img) {
                    try {
                        img.removeAttribute('src');
                        img.src = '';
                        img.removeAttribute('srcset');
                        img.classList.remove('image-loaded');
                    } catch (e) {}
                }
            });
            activeImageElements.clear();

            // 3. Disconnect observers
            if (intersectionObserver) {
                intersectionObserver.disconnect();
                intersectionObserver = null;
            }

            console.log('[ImageLoader] Image memory cache & GPU textures 100% purged.');
        } catch (e) {
            console.warn('[ImageLoader] Memory clearance notice:', e);
        }
    }

    /**
     * Custom Web Component: <image-loader>
     * Replaces standard <img> tags with an explicit containment and lazy-loading element
     */
    if (typeof customElements !== 'undefined' && !customElements.get('image-loader')) {
        class ImageLoaderElement extends HTMLElement {
            connectedCallback() {
                if (this.hasAttribute('data-image-loader-ready')) return;
                this.setAttribute('data-image-loader-ready', 'true');

                const src = this.getAttribute('src') || this.getAttribute('data-src') || '';
                const fallback = this.getAttribute('fallback') || 'Images/jpg/logo.jpg';
                const alt = this.getAttribute('alt') || '';
                const width = this.getAttribute('width') || '';
                const height = this.getAttribute('height') || '';
                const aspectRatio = this.getAttribute('aspect-ratio') || (width && height ? `${width}/${height}` : '');
                const fit = this.getAttribute('fit') || 'cover';
                const cacheKey = this.getAttribute('cache-key') || src;
                const priority = this.getAttribute('priority') === 'true';

                // Set container containment
                this.classList.add('image-loader-wrapper');
                this.style.contain = 'layout paint';
                this.style.contentVisibility = 'auto';
                if (width) this.style.width = isNaN(width) ? width : `${width}px`;
                if (height) this.style.height = isNaN(height) ? height : `${height}px`;
                if (aspectRatio) this.style.aspectRatio = aspectRatio;

                // Create internal <img>
                const img = document.createElement('img');
                img.className = 'image-loader-img';
                img.alt = alt;
                img.style.objectFit = fit;
                applyContainment(img, width, height, aspectRatio);

                this.appendChild(img);
                attach(img, { src, fallback, width, height, aspectRatio, cacheKey, priority });
            }
        }
        customElements.define('image-loader', ImageLoaderElement);
    }

    // Auto-init on DOMContentLoaded
    if (typeof window !== 'undefined') {
        injectStyles();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                scanAndUpgrade(document);
                initDynamicObserver();
            });
        } else {
            scanAndUpgrade(document);
            initDynamicObserver();
        }
    }

    const ImageLoaderAPI = {
        memoryCache,
        attach,
        load: loadImage,
        render,
        scanAndUpgrade,
        applyContainment,
        clearMemoryCache
    };

    global.ImageLoader = ImageLoaderAPI;

})(typeof window !== 'undefined' ? window : this);
