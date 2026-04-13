/**
 * Aethoria Service Worker
 *
 * Strategy: Network-first with cache fallback.
 * After a Vite build, JS/CSS files have content hashes in their names so
 * stale-cache is not a concern. We cache everything we successfully fetch and
 * serve the cache when offline.
 *
 * This lets the PWA (and Xbox PWA) work fully offline after the first load.
 */

const CACHE_VERSION = 'aethoria-v9';
const OFFLINE_URL   = '/index.html';

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Pre-cache the bare minimum so the shell loads offline immediately.
      return cache.addAll([OFFLINE_URL, '/manifest.json']).catch(() => {
        // Non-fatal: if any resource is missing (e.g. no build yet) just skip.
      });
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests; skip cross-origin API calls (Anthropic, co-op WS)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;
  // Never intercept WebSocket upgrade requests
  if (req.headers.get('upgrade') === 'websocket') return;

  event.respondWith(
    fetch(req)
      .then(networkResponse => {
        // Cache every successful GET response
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        // Offline fallback: try cache, then the offline shell
        caches.match(req).then(cached => {
          if (cached) return cached;
          // For navigation requests serve the app shell (SPA fallback)
          if (req.mode === 'navigate') return caches.match(OFFLINE_URL);
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
      )
  );
});
