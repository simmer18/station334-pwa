const CACHE = "station334-v8";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./assets/station-logo.jpeg"])));
});
self.addEventListener("fetch", event => {
  if (event.request.url.includes("/api/calls") || event.request.url.includes("/.netlify/functions")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
