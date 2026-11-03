/* Install-as-app (PWA). Shows an "Install app" button in the Settings panel (⚙) and in the ⋯ menu.
   Installed, the app opens in its own window with no browser address / search bar. */
(function(){
 let dp=null;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
 const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const secure=()=>window.isSecureContext&&location.protocol!=='file:';
 if('serviceWorker' in navigator&&secure())navigator.serviceWorker.register('sw.js').catch(()=>{});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;refresh()});
 window.addEventListener('appinstalled',()=>{dp=null;refresh();if(window.toast)toast('ElectroSim installed – open it from your apps / desktop')});
 matchMedia('(display-mode: standalone)').addEventListener&&matchMedia('(display-mode: standalone)').addEventListener('change',refresh);
 function help(){
  if(standalone())return 'ElectroSim is already running as an app.';
  if(!secure())return 'Installing needs the app to be opened from a web address (https://… or localhost), not from a file on disk. Put the folder on GitHub Pages or any web host, open it in Chrome / Edge, then press Download app again.';
  if(ios())return 'On iPhone / iPad: tap the Share button in Safari, then “Add to Home Screen”. It then opens full-screen without the address bar.';
  return 'Use your browser menu: in Chrome / Edge choose “Install ElectroSim…” (or the install icon at the right end of the address bar). Safari on Mac: File → Add to Dock.';
 }
 function block(){
  const on=standalone();
  return '<div class=sec>App</div>'+(on?'<p class=mu style="margin:2px 0">✔ Running as an installed app (no browser bar).</p>'
   :'<p class=mu style="margin:2px 0">Install ElectroSim as a stand-alone app: its own window, no address / search bar, works offline.</p><p><button class=pri data-pwa-install>⬇ Download app</button></p>'+(dp?'':'<p class=mu id=pwaNote style="margin:2px 0"></p>'));
 }
 function refresh(){
  const m=document.getElementById('mInstall');if(m)m.style.display=standalone()?'none':'';
  if(window.S&&!S.sel&&window.props)try{props()}catch(e){}
 }
 async function install(){
  if(standalone()){if(window.toast)toast(help());return}
  if(dp){dp.prompt();try{await dp.userChoice}catch(e){}dp=null;refresh();return}
  alert(help());
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-pwa-install]')){const mn=document.getElementById('menu');if(mn)mn.classList.remove('open');install()}});
 window.pwaBlock=block;
 document.addEventListener('DOMContentLoaded',refresh);
})();
