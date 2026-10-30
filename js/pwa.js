/* Registers the service worker (offline use) and handles the "Install app" button. */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
let dip=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=false)});
addEventListener('appinstalled',()=>{dip=null;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-install]');if(b&&dip){dip.prompt();dip=null}});
