const CACHE_PREFIX = 'recylight-shell-';
const CACHE_NAME = `${CACHE_PREFIX}8`;
const SHELL = [
  './', './index.html', './offline.html', './manifest.webmanifest',
  './styles.css', './hero.css', './hero-fill.css', './hero-banner.css',
  './product-cards.css', './navbar.css', './dark-mode.css', './button-colors.css',
  './language.css', './responsive.css', './phone-fit.css', './nav-actions.css',
  './account-dialog.css', './customer-chat.css', './product-detail.css', './pwa.css',
  './products-data.js', './app.js', './account-auth.js', './hero-carousel.js', './navbar.js',
  './theme.js', './language.js', './customer-chat.js', './pwa.js',
  './assets/hero-bulbs.jpg', './assets/hero-light-helper.jpg', './assets/hero-light-hands.jpg',
  './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isPrivatePath(pathname) {
  return /\/(?:admin(?:\.html|\.js|\.css|-login\.js|-login\.css)?|login\.html)(?:$|\/)/i.test(pathname)
    || /\/api(?:\/|$)/i.test(pathname);
}

function isSafeStatic(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin || isPrivatePath(url.pathname)) return false;
  return /\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname);
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isPrivatePath(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => new Response('This page needs a network connection.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    })));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(request); }
      catch {
        const cache = await caches.open(CACHE_NAME);
        const isStorefront = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
        return await cache.match(isStorefront ? './index.html' : './offline.html')
          || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (isSafeStatic(request, url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    })());
  }
});
