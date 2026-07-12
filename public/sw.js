const CACHE='junta-agua-shell-v3.1.0';
const SHELL=['/','/index.html','/manifest.webmanifest','/icons/icon.svg','/health.txt'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith('/rest/')||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/functions/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{const clone=response.clone();caches.open(CACHE).then(cache=>cache.put('/index.html',clone));return response}).catch(()=>caches.match('/index.html')));
    return;
  }
  if(['script','style','image','font','manifest'].includes(request.destination)){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(request,clone))}return response})));
  }
});
