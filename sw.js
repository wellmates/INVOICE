// =============================================
// SablonPro / WELLMATES — Service Worker
// =============================================
// PENTING: setiap kali deploy versi baru index.html,
// naikkan angka di CACHE_NAME ini (v2 -> v3 -> v4, dst).
// Ini yang memicu browser hapus cache lama & pasang yang baru.
const CACHE_NAME = 'sablonpro-v2';

const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap',
];

// File-file yang HARUS selalu dicek ke network dulu (biar update kelihatan
// tanpa perlu 2x reload). Isi app (HTML) taruh di sini.
const NETWORK_FIRST = ['index.html', './'];

// =============================================
// INSTALL — cache semua asset utama
// =============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// =============================================
// ACTIVATE — hapus SEMUA cache versi lama
// =============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isNetworkFirst(url) {
  return NETWORK_FIRST.some(name => url.endsWith(name)) || url.endsWith('/');
}

// =============================================
// FETCH
// - index.html / halaman utama -> Network First (selalu coba terbaru dulu)
// - asset lain (font, manifest, dll) -> Cache First (cepat, jarang berubah)
// =============================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = event.request.url;

  // Selalu perlakukan navigasi (buka app) sebagai network-first juga
  if (event.request.mode === 'navigate' || isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Asset statis: cache first, update cache di background
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
