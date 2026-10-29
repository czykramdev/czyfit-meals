const CACHE = "czyfit-meals-weekly-v13";
const FILES = ["./", "./index.html", "./manifest.json", "./data/plans.json", "./data/menu.json", "./assets/czyfit-mark.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
 if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
 if(e.request.mode==="navigate"||e.request.url.endsWith("/index.html")||e.request.url.endsWith("/")){
  e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match("./index.html"))));return;
 }
 e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(cache=>cache.put(e.request,r.clone()));return r})));
});