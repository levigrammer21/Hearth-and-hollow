const CACHE = "hearth-hollow-1.0.0-rc1";
const CORE = [
  "./",
  "index.html",
  "style.css",
  "app.mjs",
  "engine.mjs",
  "content.mjs",
  "world.mjs",
  "cloud.mjs",
  "firebase-config.js",
  "manifest.webmanifest",
  "icon.svg",
  "img/atlas.png",
  "img/walk.png",
  "img/crops.png",
  "img/items.png",
  "img/icon-192.png",
  "img/icon-512.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("hearth-hollow-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    new URL(e.request.url).origin !== location.origin
  )
    return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then((r) => r || new Response("Offline", { status: 503 })),
      ),
  );
});
