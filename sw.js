// Catatan Duit — bikin aplikasi tetap jalan tanpa internet.
// Naikkan VERSION setiap kali index.html diubah supaya HP ambil versi baru.
const VERSION = "v1";
const SHELL = `catatan-duit-shell-${VERSION}`;
const FONTS = "catatan-duit-fonts";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("catatan-duit-shell-") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Font Google: simpan sekali, pakai terus.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try { const res = await fetch(req); if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }
        catch { return hit || Response.error(); }
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // File aplikasi: tampilkan dari cache dulu (cepat & offline), update di belakang.
  e.respondWith(
    caches.open(SHELL).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("./index.html") : null);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })
  );
});
