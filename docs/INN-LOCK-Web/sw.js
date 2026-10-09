/* INN-LOCK · caché offline de recursos estáticos */
const V = 'innlock-v5';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/icons.js', 'js/data.js', 'js/ui.js', 'js/vendor/supabase.js', 'js/config.js', 'js/live.js', 'js/admin.js', 'js/schedule.js', 'js/wizard.js', 'js/app.js', 'manifest.webmanifest', 'assets/img/favicon.svg', 'assets/fonts/plus-jakarta-sans-latin-wght-normal.woff2', 'assets/fonts/plus-jakarta-sans-latin-ext-wght-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Solo se cachean archivos estáticos propios: nunca respuestas de Supabase (datos privados) ni enlaces temporales
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
