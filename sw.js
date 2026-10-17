/* Offline cache for the ECC audit app. The page is fetched fresh whenever online so owner changes reach every phone.
   control.json is never cached. If the site is taken down (404), every cached copy is wiped. */
const CACHE = "ecc-app-v4";
const LIBS = ["./manifest.webmanifest", "./icon-180.png", "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.26.1/lib/msal-browser.min.js"];
const wipe = () => caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(["./", "./index.html"].concat(LIBS).map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.pathname.endsWith("/control.json")) return;
  const isPage = e.request.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname);
  if (isPage) {
    e.respondWith(fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then(res => {
      if (res.status === 404 || res.status === 410) { wipe(); self.registration.unregister(); return res; }
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html"))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return res;
  }).catch(() => hit)));
});
