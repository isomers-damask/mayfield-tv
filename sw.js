/* Keeps the lobby TV running when the clinic internet drops: serves the last good copy of the page, code,
   content and music. Network first, so a new publish shows up as soon as the connection is back.
   Video clips stream straight from the network (browsers need range requests for them). */
const CACHE = "mactv-v2";
const CORE = ["./", "index.html", "src/tv.css", "src/render.js", "src/player.js", "lib/qrcode.js", "content/live.json",
  "content/fallback.js", "content/music.json", "media/logo.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("range") || /\.(mp4|webm|mov|mp3)$/i.test(url.pathname)) return;
  const key = url.pathname.endsWith("live.json") ? new Request(url.origin + url.pathname) : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(req, { signal: ctl.signal }); clearTimeout(t);
      if (res.status === 200) cache.put(key, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
