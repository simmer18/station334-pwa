
const CACHE = "station334-clean-v1";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(["/","/index.html","/style.css","/app.js","/manifest.webmanifest","/assets/station-logo.jpeg"]))); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => { if (e.request.url.includes("/api/calls")) return; e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
