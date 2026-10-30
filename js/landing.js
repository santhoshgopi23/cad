/* Landing page: renders the real simulator symbols (from parts.js) */
const $=s=>document.querySelector(s);
const cats=[...new Set(Object.values(D).map(d=>d.cat))];
let cur='All';
function gal(){
 $('#chips').innerHTML=['All',...cats].map(c=>`<button class="chip ${c==cur?'on':''}" data-c="${c}">${c}</button>`).join('');
 $('#gal').innerHTML=Object.keys(D).filter(t=>cur=='All'||D[t].cat==cur).map(t=>`<div class="sym">${icon(t)}<span>${D[t].n}</span></div>`).join('');
}
$('#chips').addEventListener('click',e=>{const c=e.target.dataset.c;if(c){cur=c;gal()}});
gal();
$('#nSym').textContent=Object.keys(D).length+'+';
/* card thumbnails */
const th=(id,keys)=>{$(id).innerHTML=keys.map(icon).join('')};
th('#th1',['pbnc','kc','cno']);th('#th2',['mcb','ovl','con3']);th('#th3',['dc','fus','pl']);
