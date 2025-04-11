// service-worker.js

// Define a unique cache name. Increment the version ('v2', 'v3', etc.)
// whenever you update the files in urlsToCache to trigger a new install.
const CACHE_NAME = 'weather-vista-cache-v2';

// List of essential files needed for the app shell to work offline.
// Ensure these paths are correct relative to the root of your website.
// Double-check that '/assets/map-placeholder.jpg' actually exists at that path.
const urlsToCache = [
    '/', // Represents the root path, often serves index.html
    '/index.html', // Explicitly cache index.html
    '/style.css',
    '/script.js',
    '/manifest.json', // Make sure manifest is cached for PWA functionality
    '/assets/logo.png',
    // '/assets/map-placeholder.jpg', // Make sure this file exists or remove it
    '/assets/favicon.ico', // Cache favicon
    // Add other critical assets like fonts if locally hosted, or icons used in HTML/CSS
];

// --- INSTALL Event ---
// Purpose: Cache the essential App Shell files when the SW is first installed or updated.
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install event triggered');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log(`[Service Worker] Opened cache: ${CACHE_NAME}`);
                console.log('[Service Worker] Caching App Shell files:', urlsToCache);
                // addAll() fetches all URLs and caches them. It's atomic - if one fails, all fail.
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[Service Worker] App Shell cached successfully.');
                // Optional: Force the waiting service worker to become the active service worker.
                // Use with caution, as it can break pages running older versions if there are breaking changes.
                // return self.skipWaiting();
            })
            .catch((error) => {
                // Log the error if caching fails. This helps debug missing files or network issues.
                console.error('[Service Worker] Failed to cache App Shell during install:', error);
                // Optional: You might want the installation to fail explicitly if caching fails.
                // throw error;
            })
    );
});

// --- ACTIVATE Event ---
// Purpose: Clean up old caches after a new Service Worker version is activated.
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate event triggered');
    // List of cache names to keep (usually just the current one)
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // If a cache name is not in our whitelist, delete it.
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Old caches deleted successfully.');
            // Ensures that the newly activated service worker takes control of the page immediately.
            return self.clients.claim();
        }).catch(error => {
            console.error('[Service Worker] Cache cleanup or client claiming failed during activate:', error);
        })
    );
});

// --- FETCH Event ---
// Purpose: Intercept network requests and serve responses from cache if available,
// otherwise fetch from the network and optionally cache the response.
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // --- Strategy: Cache falling back to Network (with improvements) ---

    // 1. Ignore non-GET requests & non-HTTP/HTTPS schemes (like chrome-extension://)
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        // Let the browser handle it directly
        return;
    }

    // 2. Handle API requests (Network First or Network Only) - IMPORTANT!
    // Avoid caching dynamic API responses in the App Shell cache.
    // Adjust the condition to match your API endpoints.
    if (url.hostname === 'api.weatherapi.com' || url.pathname.startsWith('/v1/')) {
        // console.log(`[Service Worker] Handling API request (Network First): ${request.url}`);
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    // Optionally, you *could* cache API responses in a *separate* dynamic cache,
                    // but be careful about stale data. For simplicity here, we just return it.
                    return networkResponse;
                })
                .catch(error => {
                    console.error(`[Service Worker] Network fetch failed for API request ${request.url}:`, error);
                    // Optionally return a custom offline response for API calls if needed
                    // return new Response(JSON.stringify({ error: 'Offline or API unreachable' }), {
                    //     headers: { 'Content-Type': 'application/json' },
                    //     status: 503,
                    //     statusText: 'Service Unavailable'
                    // });
                    // Re-throw the error to let the browser handle it (e.g., show network error in console)
                    throw error;
                })
        );
        return; // Don't process further for API calls
    }

    // 3. Handle App Shell / Other Static Assets (Cache First, then Network)
    // console.log(`[Service Worker] Handling static asset request (Cache First): ${request.url}`);
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // If we found a match in the cache, return it.
                if (cachedResponse) {
                    // console.log(`[Service Worker] Returning cached response for: ${request.url}`);
                    return cachedResponse;
                }

                // If no match in cache, fetch from the network.
                // console.log(`[Service Worker] No cache match, fetching from network: ${request.url}`);
                return fetch(request).then(
                    (networkResponse) => {
                        // Check if we received a valid response from the network
                        // Only cache basic (same-origin) responses with status 200
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            // console.log(`[Service Worker] Not caching non-basic/invalid response for: ${request.url}`);
                            return networkResponse; // Return non-cacheable response directly
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        // Open the cache and add the network response to it.
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                // console.log(`[Service Worker] Caching new response for: ${request.url}`);
                                cache.put(request, responseToCache);
                            })
                            .catch(cacheError => {
                                // Log caching errors but don't block the network response
                                console.error(`[Service Worker] Failed to cache response for ${request.url}:`, cacheError);
                            });

                        // Return the original network response to the page.
                        return networkResponse;
                    }
                ).catch(error => {
                    // Handle network fetch errors for static assets
                    console.error(`[Service Worker] Network fetch failed for ${request.url}:`, error);
                    // Optional: Return a fallback offline page/image
                    // if (request.destination === 'document') {
                    //     return caches.match('/offline.html');
                    // } else if (request.destination === 'image') {
                    //     return caches.match('/assets/offline-image.png');
                    // }
                    // Re-throw error to let the browser handle it
                    throw error;
                });
            })
            .catch(error => {
                // Catch any errors from caches.match() or the fetch process
                console.error(`[Service Worker] Error in fetch handler for ${request.url}:`, error);
                // Provide a generic fallback or re-throw
                // return new Response("Network error occurred", { status: 500 });
                throw error;
            })
    );
});