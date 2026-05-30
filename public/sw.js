// Service Worker for COMPREOUVENDA.COM
// Handles: Push Notifications + Offline Cache

const CACHE_VERSION = 'v2';
const CACHE_STATIC = `static-${CACHE_VERSION}`;
const CACHE_PAGES = `pages-${CACHE_VERSION}`;
const CACHE_IMAGES = `images-${CACHE_VERSION}`;
const NOTIF_CACHE = 'notifications-cache';
const MAX_NOTIF_CACHE = 50;

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/logo-full.png',
  '/logo-icon.jpeg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

const NEVER_CACHE = [
  '/api/',
  '/auth/',
  '/admin/',
  '/_next/webpack-hmr',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Remove old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![CACHE_STATIC, CACHE_PAGES, CACHE_IMAGES, NOTIF_CACHE].includes(k))
            .map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and never-cache paths
  if (request.method !== 'GET') return;
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Images: Cache First (long-lived)
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|gif|svg|ico)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // Static JS/CSS/_next: Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff|woff2|ttf|otf)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // Navigation pages: Network First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Everything else: Network First
  event.respondWith(networkFirst(request, CACHE_PAGES));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 408 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) return offlinePage;

    return new Response(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Sem conexão</title></head><body><h1>Você está offline</h1><p>Verifique sua conexão e tente novamente.</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'Nova notificação' };
  }

  const title = data.title || 'COMPREOUVENDA.COM';
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-96.png',
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    tag: data.tag || data.type || 'default',
    renotify: true,
    requireInteraction: data.type === 'new_order' || data.type === 'payment_received',
    data: {
      url: data.url || '/',
      type: data.type || 'system',
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  // Cache notification for offline viewing
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      cacheNotification({ title, ...options, created_at: Date.now() }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Track dismissals (analytics hook point)
  const data = event.notification.data || {};
  console.log('[SW] Notification dismissed:', data.type || 'unknown');
});

// ── Notification cache (offline) ───────────────────────────────────────────────

async function cacheNotification(notif) {
  try {
    const cache = await caches.open(NOTIF_CACHE);
    const existing = await cache.match('/__notifications__');
    let list = [];
    if (existing) {
      const text = await existing.text();
      list = JSON.parse(text);
    }
    list.unshift(notif);
    if (list.length > MAX_NOTIF_CACHE) list = list.slice(0, MAX_NOTIF_CACHE);
    await cache.put(
      '/__notifications__',
      new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } })
    );
  } catch (e) {
    console.warn('[SW] Failed to cache notification:', e);
  }
}

// ── Message channel ───────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'GET_CACHED_NOTIFICATIONS') {
    caches.open(NOTIF_CACHE).then(async (cache) => {
      const res = await cache.match('/__notifications__');
      const list = res ? JSON.parse(await res.text()) : [];
      event.ports[0]?.postMessage({ notifications: list });
    });
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
