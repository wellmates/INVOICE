// Service Worker untuk Invoice Wellmates PWA
const CACHE_NAME = 'invoice-v1';
const ASSETS_TO_CACHE = [
  '/INVOICE/',
  '/INVOICE/index.html',
  '/INVOICE/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.log('[Service Worker] Cache addAll error:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseClone = response.clone();
        
        // Cache successful responses
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(error => {
        console.log('[Service Worker] Fetch failed:', error);
        // Return cached version if fetch fails
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('[Service Worker] Serving from cache:', event.request.url);
              return response;
            }
            // Return offline page if available
            return new Response(
              'Aplikasi sedang offline. Silahkan periksa koneksi internet Anda.',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            );
          });
      })
  );
});

console.log('[Service Worker] Loaded');
