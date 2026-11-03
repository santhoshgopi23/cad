/* ElectroSim service worker – caches the app so it installs and also works offline. */
const CACHE='electrosim-v8.21-pwa2';
const FILES=["./", "index.html", "manifest.webmanifest", "css/style.css", "js/app.js", "js/draw.js", "js/evalve.js", "js/export.js", "js/hmi.js", "js/hmid.js", "js/hmip.js", "js/mfm.js", "js/parts2.js", "js/plc.js", "js/pneumatic.js", "js/registry.js", "js/solver.js", "js/transmitters.js", "js/valves.js", "js/vendor/jspdf.umd.min.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "examples/cda_sov_actuator.json", "examples/electric_modulating_valve.json", "examples/hmi_process_graphics.json", "examples/mfm_ct_operated.json", "examples/mfm_ct_pt_operated.json"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>0)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==location.origin)return;
 /* network first (so updates arrive), cache as the offline fallback */
 e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r})
  .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||(e.request.mode==='navigate'?caches.match('index.html'):undefined))));
});
