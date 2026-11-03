/* ElectroSim – application: state, pages, panels, interaction, dialogs. Engine: solver.js · symbols: registry.js · drawing: draw.js · PDF: export.js */
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const svg=$('#svg'),cv=$('#cv'),mq=matchMedia('(max-width:760px)');
const today=()=>new Date().toISOString().slice(0,10);
const S={pages:[{id:1,title:'Power circuit'}],pg:1,pid:2,comps:[],wires:[],shapes:[],nid:1,sel:null,run:0,pause:0,time:0,msgs:[],tk:{},wiring:null,wvia:[],m:{x:0,y:0},tool:'sel',ghost:null,
 tb:{paper:'A4',orient:'L',frame:1,project:'Untitled project',dwgNo:'',rev:'A',date:today()},free:0,snap:1,grid:1,ortho:0,
 defW:{col:'',wd:0,ds:''},          /* colour / thickness / style given to every new wire */
 vx:0,vy:0,z:1,auto:1,dirty:1,air:{}};
const pidx=()=>Math.max(0,S.pages.findIndex(p=>p.id===S.pg));
const r1=v=>Math.round(v*10)/10;
document.head.insertAdjacentHTML('beforeend',`<style id=svgcss>${SVGCSS}</style>`);
svg.setAttribute('style',PAPERVARS);svg.innerHTML='<g id=gS></g><g id=gD></g>';
const gS=$('#gS'),gD=$('#gD');
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),2400)}

/* ===== view (pan / zoom / fit) ===== */
function applyView(){const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;svg.setAttribute('viewBox',`${S.vx} ${S.vy} ${w/S.z} ${h/S.z}`);$('#zv').textContent=Math.round(S.z*100)+'%';S.dirty=1}
function fit(){const ps=$('#rPaper'),os=$('#rOrient');if(ps)ps.value=S.tb.paper;if(os)os.value=S.tb.orient;const[W,H]=paperPx(),w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const m=mq.matches?8:28;S.z=Math.max(.1,Math.min((w-m)/W,(h-m)/H));S.vx=(W-w/S.z)/2;S.vy=(H-h/S.z)/2;S.auto=1;applyView()}
function zoomAt(px,py,f){const z=Math.max(.15,Math.min(8,S.z*f)),wx=S.vx+px/S.z,wy=S.vy+py/S.z;S.z=z;S.vx=wx-px/z;S.vy=wy-py/z;S.auto=0;applyView()}
new ResizeObserver(()=>{if(S.auto)fit();else applyView()}).observe(cv);
const mp=e=>{const r=cv.getBoundingClientRect();return{x:S.vx+(e.clientX-r.left)/S.z,y:S.vy+(e.clientY-r.top)/S.z}};
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();if(e.shiftKey){S.vx+=(e.deltaY||e.deltaX)/S.z;S.auto=0;applyView();return}zoomAt(e.clientX-r.left,e.clientY-r.top,Math.exp(-e.deltaY*(e.ctrlKey?.01:.0015)))},{passive:false});
$('#zIn').onclick=()=>zoomAt(cv.clientWidth/2,cv.clientHeight/2,1.25);$('#zOut').onclick=()=>zoomAt(cv.clientWidth/2,cv.clientHeight/2,.8);$('#zFit').onclick=fit;

/* ===== panels (hide / show – the sheet grows to fill the freed space) =====
   hl = library · hr = properties · hf = results table · hp = sheet tabs */
const B=document.body.classList;
function syncPanels(){$('#tLib').setAttribute('aria-pressed',!B.contains('hl'));$('#tProps').setAttribute('aria-pressed',!B.contains('hr'));
 $('#hL').textContent=B.contains('hl')?'›':'‹';$('#hR').textContent=B.contains('hr')?'‹':'›';S.dirty=1}
function panel(cls,show){const hide=show==null?!B.contains(cls):!show;B.toggle(cls,hide);
 if(!hide&&mq.matches){if(cls==='hl')B.add('hr');if(cls==='hr')B.add('hl')}syncPanels()}
['tLib','hL'].forEach(i=>$('#'+i).onclick=()=>panel('hl'));['tProps','hR'].forEach(i=>$('#'+i).onclick=()=>panel('hr'));
$('#fTog').onclick=()=>panel('hf');$('#rRes').onclick=()=>panel('hf',true);$('#pgHide').onclick=()=>panel('hp');$('#rPg').onclick=()=>panel('hp',true);
$('#mRes').onclick=()=>{panel('hf');menuClose()};$('#mPg').onclick=()=>{panel('hp');menuClose()};
if(mq.matches)B.add('hl','hr','hf');syncPanels();
mq.addEventListener&&mq.addEventListener('change',()=>{if(mq.matches)B.add('hl','hr','hf');else B.remove('hl','hr','hf');syncPanels()});

/* ===== components ===== */
function nextLabel(pre){const u=new Set(S.comps.map(c=>c.label));let n=1;while(u.has(pre+n))n++;return pre+n}
const lastCoil=()=>{const q=[...S.comps].reverse().find(c=>D[c.type].xr);return q?q.label:'KM1'};
function clampC(c){const[W,H]=paperPx(),m=10*U,p=D[c.type].us?4:34*(c.sc||1);c.x=Math.max(m+p,Math.min(W-m-p,c.x));c.y=Math.max(m+p,Math.min(H-m-p,c.y))}
function add(type,x,y,pg){const d=D[type],c=mk(type,snapG(x),snapG(y));c.id=S.nid++;c.pg=pg||S.pg;c.label=nextLabel(d.pre);if(d.p.ref)c.p.ref=lastCoil();clampC(c);S.comps.push(c);return c}
function conn(a,b){if(a===b||S.wires.some(w=>(w.a==a&&w.b==b)||(w.a==b&&w.b==a)))return null;
 if(airK(a)!==airK(b)){toast('An air port connects only to another air port (draw an air line)');return null}
 const w={id:S.nid++,a,b};if(!airK(a)){if(S.defW.col)w.col=S.defW.col;if(S.defW.wd)w.wd=S.defW.wd;if(S.defW.ds)w.ds=S.defW.ds}S.wires.push(w);return w}
function finishWire(a,b){const w=conn(a,b),v=S.wvia||[];S.wiring=null;S.wvia=[];if(!w)return;if(v.length)w.v=v.map(q=>[q[0],q[1]]);select({k:'w',id:w.id});toast(airK(a)?'Air line added':'Wire added – pick its colour in the right panel');if(!mq.matches&&B.contains('hr'))panel('hr',true)}
function del(){const s=S.sel;if(!s)return;if(s.k=='w')S.wires=S.wires.filter(w=>w.id!=s.id);else if(s.k=='s')S.shapes=S.shapes.filter(q=>q.id!=s.id);else{S.comps=S.comps.filter(c=>c.id!=s.id);S.wires=S.wires.filter(w=>cid(w.a)!=s.id&&cid(w.b)!=s.id)}select(null)}
function rotSel(){const s=S.sel;if(!s)return;if(s.k=='s'){const q=shp(s.id);if(q&&q.k=='text')q.rot=((q.rot||0)+90)%360;return}const c=s.k=='c'&&by(s.id);if(c&&!D[c.type].norot)c.rot=(c.rot+1)%4}
function dupSel(){const s=S.sel;if(!s)return;
 if(s.k=='s'){const q=shp(s.id);if(!q)return;const n={...q,id:S.nid++};if(n.k=='line'){n.x1+=20;n.x2+=20;n.y1+=20;n.y2+=20}else{n.x+=20;n.y+=20}S.shapes.push(n);select({k:'s',id:n.id});return}
 const c=s.k=='c'&&by(s.id);if(!c)return;const n=add(c.type,c.x+30,c.y+30,c.pg);n.p={...c.p};n.rot=c.rot;n.sc=c.sc;n.mf=c.mf;n.pn=c.pn;if(c.prog)n.prog=JSON.parse(JSON.stringify(c.prog));if(c.hd)n.hd=JSON.parse(JSON.stringify(c.hd));clampC(n);select({k:'c',id:n.id})}
function select(s){S.sel=s;S.dirty=1;props();$$('#ribbon [data-cmd=rot]').forEach(b=>b.disabled=!s||s.k=='w');$$('#ribbon [data-cmd=dup],#ribbon [data-cmd=del]').forEach(b=>b.disabled=!s);const sb=$('#sbar');sb.classList.toggle('show',!!s);const q=s&&s.k=='s'&&shp(s.id);sb.dataset.k=!s?'':s.k=='s'?(q&&q.k=='text'?'st':'s'):s.k}
function viewCentre(){return{x:S.vx+cv.clientWidth/2/S.z,y:S.vy+cv.clientHeight/2/S.z}}
function place(type){const m=viewCentre(),[W,H]=paperPx();let x=snapG(Math.max(120,Math.min(W-120,m.x))),y=snapG(Math.max(120,Math.min(H-300,m.y)));
 while(S.comps.some(c=>c.pg===S.pg&&c.x===x&&c.y===y)){x+=30;y+=30}const c=add(type,x,y);select({k:'c',id:c.id});if(mq.matches)panel('hl',false)}

/* ===== library: tap to place, or drag a part onto the sheet (mouse, pen and touch) ===== */
function buildLib(q){q=(q||'').toLowerCase();const cats=[...new Set(Object.values(D).map(d=>d.cat))];let h='';
 cats.forEach(k=>{const ts=Object.keys(D).filter(t=>D[t].cat==k&&(!q||(D[t].n+' '+(D[t].ds||'')).toLowerCase().includes(q)));if(!ts.length)return;
  h+=`<details open><summary>${k}</summary><div class=grid>`+ts.map(t=>{const ip=iconParts(t);return`<div class=item data-t=${t} title="${esc(D[t].ds||D[t].n)}"><svg viewBox="${ip.vb.join(' ')}" preserveAspectRatio="xMidYMid meet">${ip.inner}</svg><span>${esc(D[t].n)}</span></div>`}).join('')+'</div></details>'});
 $('#libList').innerHTML=h||'<p class=mu>No components match.</p>'}
$('#q').addEventListener('input',e=>buildLib(e.target.value));
let lg=null,noClick=0;
$('#libList').addEventListener('pointerdown',e=>{const i=e.target.closest('[data-t]');if(!i||(e.pointerType==='mouse'&&e.button!==0))return;lg={t:i.dataset.t,el:i,sx:e.clientX,sy:e.clientY,go:0,id:e.pointerId,touch:e.pointerType!=='mouse'}});
$('#libList').addEventListener('click',e=>{if(noClick)return;const i=e.target.closest('[data-t]');if(i)place(i.dataset.t)});
$('#libList').addEventListener('dragstart',e=>e.preventDefault());
function lgStart(){lg.go=1;noClick=1;B.add('dragging');const g=document.createElement('div');g.id='ghost';g.innerHTML=lg.el.innerHTML;document.body.appendChild(g);lg.g=g;select(null);S.wiring=null;if(S.tool!=='sel')setTool('sel');if(mq.matches&&!B.contains('hl'))panel('hl',false)}
function lgOver(e){const x=e.clientX,y=e.clientY-(lg.touch?60:0),r=cv.getBoundingClientRect(),ov=x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
 lg.g.style.left=e.clientX+'px';lg.g.style.top=y+'px';cv.classList.toggle('dropok',ov);
 if(ov){const m=mp({clientX:x,clientY:y}),c=mk(lg.t,snapG(m.x),snapG(m.y));clampC(c);S.ghost={type:lg.t,x:c.x,y:c.y}}else S.ghost=null;S.dirty=1}
function lgEnd(e,cancel){if(!lg||e.pointerId!==lg.id)return;const w=lg;lg=null;if(!w.go)return;
 B.remove('dragging');w.g.remove();cv.classList.remove('dropok');const gh=S.ghost;S.ghost=null;S.dirty=1;
 if(!cancel&&gh){const c=add(gh.type,gh.x,gh.y);select({k:'c',id:c.id});toast(D[gh.type].n+' placed – drag it to move it')}else if(!cancel)toast('Drop the part on the sheet');
 setTimeout(()=>noClick=0,0)}
addEventListener('pointermove',e=>{if(!lg||e.pointerId!==lg.id)return;if(!lg.go){if(Math.hypot(e.clientX-lg.sx,e.clientY-lg.sy)<6)return;lgStart()}lgOver(e)});
addEventListener('pointerup',e=>lgEnd(e,false));addEventListener('pointercancel',e=>lgEnd(e,true));
document.addEventListener('touchmove',e=>{if(lg&&lg.go)e.preventDefault()},{passive:false});

/* ===== colour swatches (wires, lines, boxes, text) ===== */
const PAL=[['#1b2733','Black'],['#7a4a21','Brown'],['#e03131','Red'],['#f08c00','Orange'],['#f2c200','Yellow'],['#2f9e44','Green'],['#1c7ed6','Blue'],['#7048e8','Violet'],['#868e96','Grey'],['#0b7285','Teal'],['#c2255c','Magenta'],['#5c940d','Lime'],
 ['#74c0fc','Light blue'],['#8ce99a','Light green'],['#ffa8a8','Light red'],['#ffc078','Light orange'],['#ffe066','Light yellow'],['#d0bfff','Lavender'],['#99e9f2','Light cyan'],['#faa2c1','Pink'],['#c0eb75','Light lime'],['#ced4da','Light grey'],['#e8c9a0','Sand'],['#ffffff','White']];
function swatches(prop,cur,none){const c=(cur||'').toLowerCase();let h='<div class=sws>';
 if(none!=null)h+=`<button class="sw none ${!c?'on':''}" data-sw="${prop}|" title="${none}" aria-label="${none}">⌀</button>`;
 PAL.forEach(([k,n])=>h+=`<button class="sw ${c==k?'on':''}" style="background:${k}" data-sw="${prop}|${k}" title="${n}" aria-label="${n}"></button>`);
 return h+`</div><label>Custom colour<input type=color data-sp="${prop}" value="${/^#[0-9a-f]{6}$/i.test(c)?c:'#2b5d8f'}"></label>`}
const lineOpts=ds=>`<option value="" ${!ds?'selected':''}>Solid</option><option value=dash ${ds=='dash'?'selected':''}>Dashed</option><option value=dot ${ds=='dot'?'selected':''}>Dotted</option>`;
const wireForm=(o,air)=>`<div class=sec>Colour</div>${swatches('col',o.col,'Default')}<label>Thickness<input type=range min=1.5 max=8 step=.5 data-sp=wd value=${o.wd||2.5}></label>${air?'':`<label>Line style<select data-sp=ds>${lineOpts(o.ds)}</select></label>`}`;

/* ===== properties ===== */
function props(){const el=$('#propsBody'),s=S.sel;
 if(!s){el.innerHTML=`<h3>Properties</h3><div class=sec style="margin-top:0">New wires</div><p class=mu style="margin:2px 0">Colour used for the next wires you draw. Select a wire to change just that one.</p>${wireForm(S.defW)}
  <p class=mu>Drag a part from the library onto the sheet. Tap a terminal, then another terminal (or drag from one terminal to the other) to wire. Drag empty space to pan; scroll or pinch to zoom.</p>
  <p class=mu>Contacts follow the coil whose label they name, even on another page. “Net / Page Link” parts with the same name are joined across pages.</p>${window.pwaBlock?pwaBlock():''}`;return}
 if(s.k=='w'){const w=S.wires.find(q=>q.id==s.id);if(!w){select(null);return}
  const air=airK(w.a);
  el.innerHTML=`<h3>${air?'Air line':'Wire'}</h3><p class=mu style="margin:0">${air?`Compressed-air line (blue, with tick marks). ${S.run?'Pressure now: <b>'+airBar(w.a).toFixed(1)+' bar</b>.':'Press ▶ Run to see the pressure.'} Leave the colour on Default to keep it blue.`:'Choose the colour of this wire.'}</p>${wireForm(w,air)}
   <div class=row>${air?'':'<button data-a=wdef>Use for new wires</button>'}<button data-a=wpage>Apply to every ${air?'air line':'wire'} on this page</button></div><p><button data-a=del class=dn>Delete ${air?'air line':'wire'}</button></p>`;return}
 if(s.k=='s'){const q=shp(s.id);if(!q){select(null);return}el.innerHTML=shapeProps(q);return}
 const c=by(s.id),d=D[c.type];let h=`<h3>${esc(d.nv?d.nv(c):d.n)}${d.help?' <button class=hlp data-a=help title="How it works and how to wire it">❓ Help</button>':''}</h3>`;
 if(!d.nolbl)h+=`<label>Label<input data-l value="${esc(c.label)}"></label>`;
 if(!d.us)h+=`<label>Size (%) – or drag the round handle on the part<input type=number min=30 max=500 step=5 data-csz value=${Math.round((c.sc||1)*100)}></label>`;
 const P=d.pv?d.pv(c):d.p;for(const k in P){const[,u0,nm,op0]=P[k],u=typeof u0==='function'?u0(c):u0,op=typeof op0==='function'?op0(c):op0;h+=op?`<label>${nm}<select data-k=${k}>${op.map(o=>`<option ${c.p[k]==o?'selected':''}>${o}</option>`).join('')}</select></label>`:u==='txt'?`<label>${nm}<input type=text data-k=${k} value="${esc(c.p[k])}"></label>`:`<label>${nm} (${u})<input type=number step=any data-k=${k} value=${c.p[k]}></label>`}
 if(TOG.includes(c.type))h+=`<label class=ck><input type=checkbox data-on ${c.s.on?'checked':''}>${c.type=='estop'?'Pressed (latched)':c.type=='finj'?'Fault ACTIVE (inject)':['sens','lim','limnc','pnp','npn'].includes(c.type)?'Target detected':'Closed / ON'}</label>`;
 if(c.type=='pb'||c.type=='pbnc')h+='<p class=mu>Hold the pointer on the button while running.</p>';
 if(d.pp)h+=d.pp(c);
 if(d.ns)h+='<p class=note>Symbol only: drawn and listed, but not simulated.</p>';
 if(d.rl)h+='<p class=mu>Closes (NO) or opens (NC) when the coil with this label is energised. The coil can be on any page.</p>';
 if(d.xr&&!['rel','con','ton'].includes(c.type))h+='<p class=mu>Contacts that name this label are listed under the coil on the drawing.</p>';
 if(d.bom!==0)h+=`<label>Manufacturer<input data-mf placeholder="for the parts list" value="${esc(c.mf||'')}"></label><label>Part no.<input data-pn placeholder="order number" value="${esc(c.pn||'')}"></label>`;
 if(c.s.blown||c.s.tripped||c.s.fz||c.s.fm)h+=`<button data-a=fix>${c.s.blown||c.s.fz||c.s.fm?'Replace fuse':c.type==='vfd'?'Reset fault':'Reset breaker'}</button> `;
 el.innerHTML=h+`<p>${d.norot?'':'<button data-a=rot>Rotate ⟳</button> '}<button data-a=dup>Duplicate</button> <button data-a=del>Delete</button></p>`}

function shapeProps(s){const nm=s.dim?'Dimension':s.ar?'Arrow / leader':{line:'Line',rect:'Box',circle:'Circle',text:'Text',img:'Logo / picture'}[s.k];let h=`<h3>${nm}</h3>`;
 if(s.k=='text'){h+=`<label>Text<textarea data-sp=text rows=3>${esc(s.text)}</textarea></label><p class=mu style="margin:2px 0 6px">Auto-fill: <code>{page}</code> <code>{pages}</code> <code>{title}</code> <code>{project}</code> <code>{dwgno}</code> <code>{rev}</code> <code>{date}</code></p>
  <div class=two><label>Size<input type=number min=6 max=300 step=1 data-sp=size value=${s.size}></label><label>Align<select data-sp=al>${['left','center','right'].map(o=>`<option ${s.al==o?'selected':''}>${o}</option>`).join('')}</select></label></div>
  <div class=row><label class=ck><input type=checkbox data-sp=bold ${s.bold?'checked':''}>Bold</label><label class=ck><input type=checkbox data-sp=it ${s.it?'checked':''}>Italic</label></div>
  <label>Rotation<select data-sp=rot data-num=1>${[0,90,180,270].map(o=>`<option value=${o} ${(s.rot||0)==o?'selected':''}>${o}°</option>`).join('')}</select></label>
  <div class=sec>Text colour</div>${swatches('col',s.col,'Default')}`}
 else if(s.k=='img'){h+=`<label>Width (mm)<input type=number min=3 step=1 data-sp=w data-mul=4 value=${r1(s.w/U)}></label><p class=mu>Drag the corner handles on the sheet to resize, or drag the picture to move it.</p><button data-a=imgrep>Replace picture…</button>`}
 else{if(s.k=='circle')h+=`<label>Radius (mm)<input type=number min=1 step=1 data-sp=r data-mul=4 value=${r1(s.r/U)}></label>`;
  if(s.k=='rect')h+=`<div class=two><label>Width (mm)<input type=number min=1 step=1 data-sp=w data-mul=4 value=${r1(s.w/U)}></label><label>Height (mm)<input type=number min=1 step=1 data-sp=h data-mul=4 value=${r1(s.h/U)}></label></div>`;
  h+=`<div class=sec>${s.k=='rect'||s.k=='circle'?'Border colour':'Colour'}</div>${swatches('col',s.col,'Default')}`;
  if(s.k=='rect'||s.k=='circle')h+=`<div class=sec>Fill</div>${swatches('fill',s.fill,'None')}`;
  h+=`<label>Thickness<input type=range min=1 max=10 step=.5 data-sp=wd value=${s.wd||2}></label><label>Line style<select data-sp=ds>${lineOpts(s.ds)}</select></label>`}
 return h+`<label class=ck style="margin-top:12px"><input type=checkbox data-sp=all ${s.all?'checked':''}>Show on every page</label>
  <p class=mu style="margin:2px 0 6px">Tick this for title-block lines, text and logos you want on all sheets.</p><p>${s.k=='text'?'<button data-a=rot>Rotate ⟳</button> ':''}<button data-a=dup>Duplicate</button> <button data-a=del class=dn>Delete</button></p>`}

/* target of the colour / thickness / style controls: the selected wire or shape, or the "new wire" defaults */
function target(){const s=S.sel;if(!s)return S.defW;if(s.k=='w')return S.wires.find(w=>w.id==s.id);if(s.k=='s')return shp(s.id);return null}
$('#propsBody').addEventListener('input',e=>{const t=e.target;
 if('sp'in t.dataset){const o=target();if(!o)return;const k=t.dataset.sp;let v=t.type=='checkbox'?(t.checked?1:0):t.type=='number'||t.type=='range'?parseFloat(t.value):t.dataset.num?+t.value:t.value;
  if(t.dataset.mul){if(!(v>0))return;v*=+t.dataset.mul}else if(Number.isNaN(v))return;
  if(k=='size'&&!(v>=6))return;o[k]=v;if(o.k=='img'&&k=='w')o.h=o.w*o.ar;S.dirty=1;return}
 const c=S.sel&&S.sel.k=='c'&&by(S.sel.id);if(!c)return;
 if('csz'in t.dataset){const v=parseFloat(t.value);if(v>=30&&v<=500){c.sc=v/100;clampC(c)}S.dirty=1;return}
 if('l'in t.dataset)c.label=t.value;else if('mf'in t.dataset)c.mf=t.value;else if('pn'in t.dataset)c.pn=t.value;else if('on'in t.dataset)c.s.on=t.checked;
 else if(t.tagName=='SELECT'){c.p[t.dataset.k]=t.value;if(D[c.type].chg&&D[c.type].chg(c,t.dataset.k))props()}else if(t.type=='text'&&t.dataset.k)c.p[t.dataset.k]=t.value;
 else if(t.dataset.k){const v=parseFloat(t.value);if(Number.isFinite(v)&&(v>0||D[c.type].anyNum))c.p[t.dataset.k]=v}S.dirty=1});
function doAct(a){const c=S.sel&&S.sel.k=='c'&&by(S.sel.id),q=S.sel&&S.sel.k=='s'&&shp(S.sel.id);
 if(a=='del')del();if(a=='rot'){rotSel();if(q)props()}if(a=='dup')dupSel();if(a=='fix'&&c){c.s.blown=c.s.tripped=c.s.fz=c.s.fm=0;props()}
 if(a=='edit'){if(q&&q.k=='text')focusText();else panel('hr',true)}
 if(a=='imgrep'&&q)pickImage(q);
 if(a=='plc'&&c&&c.type=='plc')plcOpen(c);
 if(a=='hmi'&&c&&c.type=='hmi')hmidOpen(c);
 if(a=='help'&&c&&D[c.type].help)D[c.type].help(c);
 if(a=='wdef'){const w=S.wires.find(x=>x.id==S.sel.id);if(w){S.defW={col:w.col||'',wd:w.wd||0,ds:w.ds||''};toast('New wires will use this style')}}
 if(a=='wpage'){const w=S.wires.find(x=>x.id==S.sel.id);if(w)S.wires.forEach(x=>{const p=by(cid(x.a));if(p&&p.pg===S.pg&&airK(x.a)===airK(w.a)){x.col=w.col;x.wd=w.wd;x.ds=w.ds}});toast('Applied to every '+(airK(w.a)?'air line':'wire')+' on this page')}
 S.dirty=1}
$('#propsBody').addEventListener('click',e=>{const ck=e.target.closest('[data-clk]');if(ck&&S.sel&&S.sel.k=='c'){const c=by(S.sel.id);if(c&&D[c.type].clk){D[c.type].clk(c,ck.dataset.clk);props();S.dirty=1}return}
 const sw=e.target.closest('[data-sw]');if(sw){const o=target();if(o){const[k,v]=sw.dataset.sw.split('|');o[k]=v;props();S.dirty=1}return}
 const a=e.target.dataset.a;if(a)doAct(a)});
$('#sbar').addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)doAct(a.dataset.a)});
function focusText(){if(B.contains('hr'))panel('hr',true);setTimeout(()=>{const t=$('#propsBody [data-sp=text]');if(t){t.focus();t.select()}},80)}

/* ===== drawing tools: line, box, text, logo / picture ===== */
const snS=v=>Math.round(v/5)*5;
const HINT={sel:'',line:'Line: drag on the sheet. Near-straight lines snap straight (hold Alt for free). Esc to finish.',dim:'Dimension: drag from one point to the other – the length in mm is written on the line. Esc to finish.',arrow:'Arrow / leader: drag from the tail to the point it should indicate. Esc to finish.',circle:'Circle: drag from the centre outwards. Esc to finish.',rect:'Box: drag on the sheet to draw a rectangle. Esc to finish.',text:'Text: tap where the text should start.'};
function setTool(t){S.tool=t;S.wiring=null;if(t!=='sel')select(null);
 $$('#ribbon [data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t)));
 const h=$('#thint');h.textContent=HINT[t]||'';h.classList.toggle('show',!!HINT[t]);cv.classList.toggle('drawing',t!=='sel');S.dirty=1}
function newShape(k,x,y){const s={id:S.nid++,k,pg:S.pg,all:0,col:'',wd:2,ds:''};
 if(k==='line')Object.assign(s,{x1:x,y1:y,x2:x,y2:y});
 if(k==='rect')Object.assign(s,{x,y,w:0,h:0,fill:''});
 if(k==='circle')Object.assign(s,{x,y,r:0,fill:''});
 if(k==='text')Object.assign(s,{x,y,text:'Text',size:18,bold:0,it:0,al:'left',rot:0});
 S.shapes.push(s);return s}
function pt(e){const m=mp(e),[W,H]=paperPx();let x=Math.max(0,Math.min(W,m.x)),y=Math.max(0,Math.min(H,m.y));if(!e.altKey&&S.snap!==0){x=snS(x);y=snS(y)}return{x,y}}
function straighten(x,y,ax,ay,force,free){if(force||!free){const dx=Math.abs(x-ax),dy=Math.abs(y-ay);if(force){if(dx>=dy)y=ay;else x=ax}else{if(dy<=8&&dx>dy)y=ay;else if(dx<=8&&dy>dx)x=ax}}return[x,y]}
function startTool(e){const p=pt(e),t=S.tool;
 if(t==='text'){const s=newShape('text',p.x,p.y);setTool('sel');select({k:'s',id:s.id});focusText();return}
 const sh=newShape(t==='dim'||t==='arrow'?'line':t,p.x,p.y);if(t==='dim')sh.dim=1;if(t==='arrow')sh.ar=1;drag={mode:'new',s:sh,o:{x:p.x,y:p.y}}}
function moveShape(s,o,dx,dy,free){const q=v=>free?v:snS(v);
 if(s.k==='line'){const nx=q(o.x1+dx)-o.x1,ny=q(o.y1+dy)-o.y1;s.x1=o.x1+nx;s.x2=o.x2+nx;s.y1=o.y1+ny;s.y2=o.y2+ny}else{s.x=q(o.x+dx);s.y=q(o.y+dy)}}
function dragShape(d,e){const s=d.s,o=d.o,p=pt(e);
 if(d.mode==='new'){if(s.k==='line'){const[x,y]=straighten(p.x,p.y,s.x1,s.y1,e.shiftKey||!!S.ortho,e.altKey);s.x2=x;s.y2=y}else if(s.k==='circle'){s.r=Math.hypot(p.x-o.x,p.y-o.y)}else{s.x=Math.min(p.x,o.x);s.y=Math.min(p.y,o.y);s.w=Math.abs(p.x-o.x);s.h=Math.abs(p.y-o.y)}return}
 if(s.k==='circle'){s.r=Math.max(3,Math.hypot(p.x-s.x,p.y-s.y));return}
 if(s.k==='line'){const ax=d.h==='p1'?o.x2:o.x1,ay=d.h==='p1'?o.y2:o.y1,[x,y]=straighten(p.x,p.y,ax,ay,e.shiftKey||!!S.ortho,e.altKey);if(d.h==='p1'){s.x1=x;s.y1=y}else{s.x2=x;s.y2=y}return}
 const fx=d.h.includes('w')?o.x+o.w:o.x,fy=d.h.includes('n')?o.y+o.h:o.y;let w=Math.abs(p.x-fx),h=Math.abs(p.y-fy);
 if(s.k==='img'){w=Math.max(10,w);h=w*s.ar;s.w=w;s.h=h;s.x=p.x<fx?fx-w:fx;s.y=p.y<fy?fy-h:fy}else{s.w=Math.max(5,w);s.h=Math.max(5,h);s.x=p.x<fx?fx-s.w:fx;s.y=p.y<fy?fy-s.h:fy}}
let imgTarget=null;
function pickImage(sh){imgTarget=sh;$('#imgIn').click()}
$('#imgIn').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onerror=()=>toast('Could not read that file');
 r.onload=()=>{const im=new Image();im.onerror=()=>toast('That file is not a picture I can open');im.onload=()=>{
  const k=Math.min(1,900/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*k));c.height=Math.max(1,Math.round(im.height*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  const src=c.toDataURL(/jpe?g/i.test(f.type)?'image/jpeg':'image/png',.92),ar=c.height/c.width;
  if(imgTarget&&shp(imgTarget.id)){const s=imgTarget;s.src=src;s.ar=ar;s.h=s.w*ar;select({k:'s',id:s.id})}
  else{const m=viewCentre(),[W,H]=paperPx(),w=160,s={id:S.nid++,k:'img',pg:S.pg,all:0,x:snS(Math.max(0,Math.min(W-w,m.x-w/2))),y:snS(Math.max(0,Math.min(H-w*ar,m.y-w*ar/2))),w,h:w*ar,ar,src};S.shapes.push(s);setTool('sel');select({k:'s',id:s.id});toast('Logo added – drag it into place, drag a corner to resize')}
  imgTarget=null;S.dirty=1};im.src=r.result};r.readAsDataURL(f)});

/* ===== pointer interaction (mouse, pen, touch) ===== */
const pointerHint={done:0,w:0};
const ptrs=new Map();let drag=null,pan=null,pinch=null,moved=0,tw=null,wpt=null;
svg.addEventListener('pointerdown',e=>{
 if(mq.matches&&(!B.contains('hl')||!B.contains('hr'))){B.add('hl','hr');syncPanels()}
 try{svg.setPointerCapture(e.pointerId)}catch(_){}
 ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(ptrs.size===2){if(drag&&drag.mode==='new')S.shapes=S.shapes.filter(q=>q!==drag.s);drag=null;pan=null;tw=null;wpt=null;const[a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,z:S.z};return}
 const m=mp(e);moved=0;
 if(e.pointerType==='mouse'&&e.button===1){pan={x:e.clientX,y:e.clientY,vx:S.vx,vy:S.vy};return}
 if(e.pointerType==='mouse'&&e.button!==0)return;
 const CH=e.target.closest('[data-ch]');
 if(CH&&S.tool==='sel'){const c=by(+CH.dataset.ch);if(c){S.free=1;drag={mode:'z',c,d0:Math.max(12,Math.hypot(m.x-c.x,m.y-c.y)),sc0:c.sc||1};return}}
 const HD=e.target.closest('[data-hd]');
 if(HD){const s=shp(+HD.dataset.hs);if(s)drag={mode:'h',s,h:HD.dataset.hd,o:{...s}};return}
 if(S.tool!=='sel'){startTool(e);return}
 let T=e.target.closest('[data-t]');const C=e.target.closest('[data-c]'),SH=e.target.closest('[data-s]'),W=e.target.closest('[data-w]');
 /* finger on a tiny, zoomed-out part: grab the part (move it) instead of a terminal – zoom in to wire */
 if(T&&e.pointerType!=='mouse'&&S.z<.6&&!S.wiring){T=null;if(!pointerHint.done){pointerHint.done=1;toast('Zoom in to connect terminals with wires')}}
 if(T){const k=T.dataset.c+'.'+T.dataset.t;S.m=m;
  if(S.wiring&&S.wiring!==k){finishWire(S.wiring,k);return}
  if(S.wiring===k){S.wiring=null;return}
  if(S.sel)select(null);S.wiring=k;S.wvia=[];tw={k,sx:e.clientX,sy:e.clientY,moved:0};if(pointerHint.w<3){pointerHint.w++;toast('Click to place wire corners · click another terminal to finish · Backspace = undo last corner · Esc = cancel')}return}
 if(S.wiring){wpt={sx:e.clientX,sy:e.clientY,x:m.x,y:m.y};pan={x:e.clientX,y:e.clientY,vx:S.vx,vy:S.vy};return}
 const WV=e.target.closest('[data-wv]');if(WV&&S.tool==='sel'){const w=S.wires.find(x=>x.id==+WV.dataset.wv);if(w&&w.v){drag={mode:'v',w,i:+WV.dataset.vi};return}}
 if(C){const c=by(+C.dataset.c);c._g=(c._g||0)+1;S.free=0;select({k:'c',id:c.id});S.wiring=null;drag={mode:'c',c,dx:m.x-c.x,dy:m.y-c.y,sx:e.clientX,sy:e.clientY,clk:(e.target.closest&&e.target.closest('[data-clk]')||{dataset:{}}).dataset.clk};if(S.run&&(c.type=='pb'||c.type=='pbnc'))c.s.pressed=1;if(D[c.type].dn)D[c.type].dn(c,drag.clk);return}
 if(SH){const s=shp(+SH.dataset.s);if(s){S.wiring=null;select({k:'s',id:s.id});drag={mode:'s',s,o:{...s},m0:m,sx:e.clientX,sy:e.clientY}}return}
 if(W){S.wiring=null;select({k:'w',id:+W.dataset.w});return}
 select(null);S.wiring=null;pan={x:e.clientX,y:e.clientY,vx:S.vx,vy:S.vy}});
addEventListener('pointermove',e=>{S.m=mp(e);$('#xy').textContent='X '+r1(S.m.x/U).toFixed(1)+'  Y '+r1(S.m.y/U).toFixed(1)+' mm';if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pinch&&ptrs.size>=2){const[a,b]=[...ptrs.values()],r=cv.getBoundingClientRect(),d=Math.hypot(a.x-b.x,a.y-b.y)||1,f=Math.max(.15,Math.min(8,pinch.z*d/pinch.d))/S.z;zoomAt((a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top,f);return}
 if(tw&&!tw.moved&&Math.hypot(e.clientX-tw.sx,e.clientY-tw.sy)>8)tw.moved=1;
 if(drag){if(!moved&&drag.sx!=null&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>(drag.mode==='c'?2:4))moved=1;
  if(drag.mode==='c'){if(moved){const m=mp(e);S.free=1;drag.c.x=m.x-drag.dx;drag.c.y=m.y-drag.dy;clampC(drag.c)}}
  else if(drag.mode==='v'){const m=mp(e),q=drag.w.v[drag.i];if(q){q[0]=snapG(m.x);q[1]=snapG(m.y)}}
  else if(drag.mode==='z'){const m=mp(e),c=drag.c;S.free=1;c.sc=Math.max(.4,Math.min(4,drag.sc0*Math.hypot(m.x-c.x,m.y-c.y)/drag.d0))}
  else if(drag.mode==='s'){if(moved){const m=mp(e);moveShape(drag.s,drag.o,m.x-drag.m0.x,m.y-drag.m0.y,e.altKey)}}
  else dragShape(drag,e)}
 else if(pan){S.vx=pan.vx-(e.clientX-pan.x)/S.z;S.vy=pan.vy-(e.clientY-pan.y)/S.z;S.auto=0;applyView()}});
/* free drag: the part follows the pointer exactly; on release it glides onto the nearest grid point so terminals stay wire-aligned */
function glide(c){const x0=c.x,y0=c.y,t={type:c.type,x:snapG(x0),y:snapG(y0)};clampC(t);if(t.x===x0&&t.y===y0){S.free=0;return}
 const k=c._g=(c._g||0)+1,t0=performance.now();(function st(n){if(c._g!==k)return;const u=Math.min(1,(n-t0)/110),e=1-Math.pow(1-u,3);c.x=x0+(t.x-x0)*e;c.y=y0+(t.y-y0)*e;S.dirty=1;if(u<1)requestAnimationFrame(st);else{c.x=t.x;c.y=t.y;S.free=0}})(t0)}
function endPtr(e){ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;
 if(!ptrs.size){
  if(wpt){if(S.wiring&&Math.hypot(e.clientX-wpt.sx,e.clientY-wpt.sy)<6){const q=wvSnap(wpt),l=wvBase();if(q[0]!==l[0]||q[1]!==l[1])S.wvia.push(q)}wpt=null}
  if(tw){if(tw.moved){const el=document.elementFromPoint(e.clientX,e.clientY),T=el&&el.closest&&el.closest('[data-t]'),k=T&&T.dataset.c+'.'+T.dataset.t;if(k&&k!==tw.k)finishWire(tw.k,k);else S.wiring=null}tw=null}
  if(drag){
   if(drag.mode==='c'){const c=drag.c;if(moved)glide(c);else S.free=0;
    if(!moved&&(c.type==='plc'||c.type==='hmi')&&drag.clk==null){const n=performance.now();if(plcTap&&plcTap.id===c.id&&n-plcTap.t<450){plcTap=null;c.type==='plc'?plcOpen(c):hmidOpen(c)}else plcTap={id:c.id,t:n}}if(!moved&&drag.clk!=null&&D[c.type].clk){D[c.type].clk(c,drag.clk);props();S.dirty=1}if(S.run&&!moved){if(TOG.includes(c.type)){c.s.on=!c.s.on;props()}else if(c.type=='sel3'){const o=['HAND','OFF','AUTO'];c.p.pos=o[(o.indexOf(c.p.pos)+1)%3];props()}}}
   else if(drag.mode==='new'){const s=drag.s,tiny=s.k==='line'?Math.hypot(s.x2-s.x1,s.y2-s.y1)<5:s.k==='circle'?s.r<3:(s.w<5||s.h<5);if(tiny)S.shapes=S.shapes.filter(q=>q!==s);else select({k:'s',id:s.id})}
   else if(drag.mode==='z'){const c=drag.c;c.sc=Math.round(c.sc*20)/20;clampC(c);S.free=0;props()}
   else if(drag.mode==='h')props();
  }
  drag=null;pan=null;S.comps.forEach(c=>{c.s.pressed=0;if(c.s.hp)c.s.hp=0})}S.dirty=1}
addEventListener('pointerup',endPtr);addEventListener('pointercancel',endPtr);
svg.addEventListener('contextmenu',e=>{if(S.wiring){e.preventDefault();S.wiring=null;S.wvia=[];wpt=null;S.dirty=1;toast('Wire cancelled')}});
svg.addEventListener('dblclick',e=>{const WV=e.target.closest('[data-wv]');if(WV){const w=S.wires.find(x=>x.id==+WV.dataset.wv);if(w&&w.v){w.v.splice(+WV.dataset.vi,1);if(!w.v.length)delete w.v;S.dirty=1}return}const SH=e.target.closest('[data-s]');if(!SH)return;const s=shp(+SH.dataset.s);if(s&&s.k=='text'){select({k:'s',id:s.id});focusText()}});
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||document.querySelector('dialog[open]'))return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey){const k=e.key.toLowerCase();if(k==='z'){e.preventDefault();hgo(e.shiftKey?1:-1);return}if(k==='y'){e.preventDefault();hgo(1);return}}
 const fk={F7:'grid',F8:'ortho',F9:'snap'}[e.key];if(fk){e.preventDefault();toggleSt(fk);return}
 if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&/^[a-z0-9]$/i.test(e.key)){e.preventDefault();cmdOpen(e.key);return}
 if(e.key=='Enter'&&lastCmd){e.preventDefault();cmdRun(lastCmd);return}
 if(S.wiring&&(e.key=='Delete'||e.key=='Backspace')){e.preventDefault();S.wvia.pop();S.dirty=1;return}
 if(e.key=='Delete'||e.key=='Backspace')del();
 if(e.key=='Escape'){S.wiring=null;S.wvia=[];if(S.tool!=='sel')setTool('sel');select(null)}
 const ar={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(ar&&S.sel){e.preventDefault();if(S.sel.k=='c'){const c=by(S.sel.id);if(c){c.x+=ar[0]*GRID;c.y+=ar[1]*GRID;clampC(c)}}else if(S.sel.k=='s'){const s=shp(S.sel.id);if(s)moveShape(s,{...s},ar[0]*5,ar[1]*5,1)}}
 S.dirty=1});
['input','change','click','keydown','wheel','resize'].forEach(ev=>addEventListener(ev,()=>S.dirty=1,true));

/* ===== pages ===== */
function renderTabs(){const t=$('#pgs');t.innerHTML=S.pages.map((p,i)=>`<button class="pgt ${p.id===S.pg?'act':''}" data-pg=${p.id}>${i+1}. ${esc(p.title)}${p.id===S.pg?' <span class=pe>✎</span>':''}</button>`).join('');
 const a=t.querySelector('.act');if(a&&a.scrollIntoView)a.scrollIntoView({inline:'nearest',block:'nearest'})}
function setPage(id){S.pg=id;S.wiring=null;select(null);renderTabs();fit()}
function addPage(){const id=S.pid++;S.pages.push({id,title:'Sheet '+(S.pages.length+1)});setPage(id);toast('Page '+S.pages.length+' added')}
$('#pgAdd').onclick=addPage;
$('#pgs').addEventListener('click',e=>{const b=e.target.closest('[data-pg]');if(!b)return;const id=+b.dataset.pg;if(id===S.pg)openPG();else setPage(id)});
function openPG(){$('#pgTitle').value=S.pages[pidx()].title;$('#pgDel').disabled=S.pages.length<2;$('#dPG').showModal()}
$('#pgTitle').addEventListener('input',e=>{S.pages[pidx()].title=e.target.value;renderTabs();S.dirty=1});
$('#pgL').onclick=()=>movePage(-1);$('#pgR').onclick=()=>movePage(1);
function movePage(d){const i=pidx(),j=i+d;if(j<0||j>=S.pages.length)return;[S.pages[i],S.pages[j]]=[S.pages[j],S.pages[i]];renderTabs();S.dirty=1}
$('#pgDel').onclick=()=>{if(S.pages.length<2)return;if(!confirm('Delete this page and everything on it?'))return;const id=S.pg,i=pidx(),ids=new Set(S.comps.filter(c=>c.pg===id).map(c=>c.id));
 S.comps=S.comps.filter(c=>c.pg!==id);S.wires=S.wires.filter(w=>!ids.has(cid(w.a))&&!ids.has(cid(w.b)));S.shapes=S.shapes.filter(s=>s.all||s.pg!==id);S.pages.splice(i,1);$('#dPG').close();setPage(S.pages[Math.max(0,i-1)].id)};
$$('dialog [data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

/* ===== sheet setup dialog ===== */
function openTB(){const tb=S.tb;$$('[data-tb]').forEach(i=>i.value=tb[i.dataset.tb]||'');$('#tbFrame').checked=tb.frame!==0;$('#dTB').showModal()}
$('#dTB').addEventListener('input',e=>{const t=e.target;
 if(t.id==='tbFrame')S.tb.frame=t.checked?1:0;
 else if(t.dataset.tb){S.tb[t.dataset.tb]=t.value;if(t.dataset.tb==='paper'||t.dataset.tb==='orient')fit()}S.dirty=1});
$('#bTB').onclick=openTB;

/* ===== Plot / print dialog: asks for paper size and orientation (like AutoCAD's Plot) ===== */
function plotPrev(){const p=PAPER[S.tb.paper]||PAPER.A4,[w,h]=S.tb.orient==='P'?[p[1],p[0]]:[p[0],p[1]],k=96/Math.max(w,h),sp=$('#xPrev span');sp.style.width=w*k+'px';sp.style.height=h*k+'px';
 $('#xPrevT').textContent=`${S.tb.paper} ${S.tb.orient==='P'?'portrait':'landscape'} · ${Math.min(w,h)} × ${Math.max(w,h)} mm`}
function openPlot(){$('#xPaper').value=S.tb.paper;$('#xOrient').value=S.tb.orient;$('#xRange').value='all';$('#xProg').textContent='';$('#xGo').disabled=false;plotPrev();$('#dPDF').showModal()}
$('#bPDF').onclick=openPlot;
['xPaper','xOrient'].forEach(id=>$('#'+id).addEventListener('change',e=>{S.tb[id==='xPaper'?'paper':'orient']=e.target.value;plotPrev();fit()}));
$('#xGo').onclick=async()=>{const o={sheets:$('#xSheets').checked,bom:$('#xBom').checked,range:$('#xRange').value};if(!o.sheets&&!o.bom){$('#xProg').textContent='Choose something to plot.';return}
 $('#xGo').disabled=true;try{const doc=await exportPDF(o,t=>{$('#xProg').textContent=t});const nm=((S.tb.dwgNo||S.tb.project||'electrosim').replace(/[^\w\-. ]+/g,'_').trim()||'electrosim')+'.pdf';doc.save(nm);$('#xProg').textContent='Saved '+nm;toast('PDF saved')}
 catch(err){$('#xProg').textContent='Plot failed: '+err.message}$('#xGo').disabled=false};

/* ===== results ===== */
function tbl(){$('#tb').innerHTML=S.run?S.comps.filter(c=>c.o).map(c=>`<tr data-r=${c.id}><td>${esc(c.label)} <span class=mu>${esc(D[c.type].n)}</span></td>${D[c.type].pn?`<td colspan=3>${D[c.type].pn(c)}</td>`:`<td>${f(c.o.v)} V</td><td>${f(c.o.i)} A</td><td>${f(c.o.p)} W</td>`}<td>${stt(c)}</td><td class=mu>${pnum(c.pg)}</td></tr>`).join(''):'<tr><td colspan=6 class=mu>Press RUN to start the simulation.</td></tr>';
 const sup=S.comps.filter(c=>D[c.type].src&&c.o).reduce((a,c)=>a+c.o.p,0);
 $('#msgs').innerHTML=(S.run?`<div class=mu>Total supply power: <b>${f(sup)} W</b></div>`:'')+(S.run?S.msgs:[['ok','Idle – build a circuit, then press RUN']]).map(m=>`<div class="m ${m[0]}">${m[1]}</div>`).join('')}
$('#tb').addEventListener('click',e=>{const r=e.target.closest('[data-r]');if(!r)return;const c=by(+r.dataset.r);if(!c)return;if(c.pg!==S.pg)setPage(c.pg);select({k:'c',id:c.id})});

/* ===== run control, save / load ===== */
function setRun(r,p){S.run=r;S.pause=p;$('#bRun').setAttribute('aria-pressed',String(!!r&&!p));$('#bPause').setAttribute('aria-pressed',String(!!r&&!!p));const e=$('#stat');e.textContent=!r?'STOPPED':p?'PAUSED':'RUNNING · t='+S.time.toFixed(1)+'s';e.style.color=!r?'':p?'var(--wa)':'var(--ok)';S.dirty=1}
function stop(){setRun(0,0);S.time=0;S.tk={};S.air={};S.msgs=[];S.comps.forEach(c=>{c.o=null;c.ph=null;c.vp=c.dl=0;Object.assign(c.s,{en:0,done:0,hold:0,t:0,fw:0,vc:0,blown:0,tripped:0,ang:0,pressed:0,fo:0,pw:0,pin:0,rpm:0,f:0,rq:0,io:0,vo:0,dir:1,vai:0,fref:0,mn:0,mx:0,vm:0,rd:0,fz:0,fm:0,good:0,lim:0,ld:1,al:0,bp:0,dry:0,tm:0,why:'',hint:'',live:0,vo:0,pl:0,in:0});if(c.type==='hmi')hmiReset(c)});tbl()}
$('#bRun').onclick=()=>{if(!S.run||S.pause){setRun(1,0);step()}};$('#bPause').onclick=()=>{if(S.run)setRun(1,!S.pause)};$('#bStop').onclick=stop;
const snapshot=()=>({v:3,pages:S.pages,pg:S.pg,pid:S.pid,tb:S.tb,n:S.nid,w:S.wires,sh:S.shapes,dw:S.defW,c:S.comps.map(c=>({id:c.id,type:c.type,x:c.x,y:c.y,rot:c.rot,sc:c.sc,label:c.label,p:c.p,s:c.s,pg:c.pg,mf:c.mf,pn:c.pn,prog:c.prog,tags:c.tags,hd:c.hd}))});
function loadData(d){stop();S.shapes=[];
 if(d.v>=2){S.pages=d.pages;S.pg=d.pg;S.pid=d.pid;const t=d.tb||{};S.tb={paper:t.paper||'A4',orient:t.orient==='P'?'P':'L',frame:t.frame===0?0:1,project:t.project||'',dwgNo:t.dwgNo||'',rev:t.rev||'A',date:t.date||today()};S.comps=d.c;S.wires=d.w;S.nid=d.n;S.shapes=d.sh||[];S.defW=d.dw||{col:'',wd:0,ds:''};
  if(d.v===2&&t.logo){const im=new Image(),pg0=S.pages[0].id;im.onload=()=>{const[W,H]=paperPx(),w=160,ar=im.height/im.width;S.shapes.push({id:S.nid++,k:'img',pg:pg0,all:1,x:W-60-w,y:H-60-w*ar,w,h:w*ar,ar,src:t.logo});S.dirty=1};im.src=t.logo}}
 else{S.pages=[{id:1,title:'Sheet 1'}];S.pg=1;S.pid=2;S.comps=d.c.map(c=>({id:c.id,type:c.type,x:snapG(c.x*.5),y:snapG(c.y*.5),rot:c.rot,label:c.label,p:c.p,s:c.s,pg:1}));S.wires=d.w;S.nid=d.n}
 S.comps.forEach(mfLegacy);S.comps=S.comps.filter(c=>D[c.type]);S.comps.forEach(c=>{c.s=c.s||{};c.p=c.p||{};for(const k in D[c.type].p)if(!(k in c.p))c.p[k]=D[c.type].p[k][0]});
 {const oa=new Set(S.comps.filter(c=>c.type==='pws').map(c=>c.id+'.3'));if(oa.size)S.wires=S.wires.filter(w=>!oa.has(String(w.a))&&!oa.has(String(w.b)))} /* v8.15: the old air port of the pressure switch is gone */
 if(!S.pages.some(p=>p.id===S.pg))S.pg=S.pages[0].id;setTool('sel');renderTabs();select(null);fit()}
const menuClose=()=>$('#menu').classList.remove('open');
$('#bSave').onclick=()=>{try{localStorage.setItem('esim3',JSON.stringify(snapshot()));toast('Saved in this browser')}catch(e){toast('Save failed (browser storage full?) – use Download instead')}menuClose()};
$('#bLoad').onclick=()=>{try{const d=JSON.parse(localStorage.getItem('esim3')||localStorage.getItem('esim2')||localStorage.getItem('esim'));if(!d)throw 0;loadData(d);toast('Loaded')}catch(e){toast('Nothing saved yet')}menuClose()};
$('#bDown').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(snapshot())],{type:'application/json'}));a.download=(S.tb.dwgNo||S.tb.project||'electrosim').replace(/[^\w\-. ]+/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);menuClose()};
$('#bOpen').onclick=()=>$('#fileIn').click();
$('#fileIn').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{loadData(JSON.parse(r.result));toast('Project opened')}catch(x){toast('Not a valid project file')}};r.readAsText(f);e.target.value='';menuClose()});
$('#bReset').onclick=()=>{if(!confirm('Clear every page? Lines, text and logos set to “Show on every page” (your title block) are kept.'))return;stop();S.comps=[];S.wires=[];S.shapes=S.shapes.filter(s=>s.all).map(s=>({...s,pg:1}));S.pages=[{id:1,title:'Sheet 1'}];S.pg=1;S.pid=2;select(null);renderTabs();fit();menuClose()};
$('#bMore').onclick=e=>{e.stopPropagation();$('#menu').classList.toggle('open')};addEventListener('click',e=>{if(!e.target.closest('#menu'))menuClose()});


/* ===== undo / redo (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z) – snapshots of the whole drawing, taken after every edit while not running ===== */
const H=[],hs={i:-1};
function commit(){if(S.run)return;const j=JSON.stringify(snapshot());if(j===H[hs.i])return;H.length=hs.i+1;H.push(j);if(H.length>40)H.shift();hs.i=H.length-1}
function hgo(d){commit();const i=hs.i+d;if(i<0||i>=H.length){toast(d<0?'Nothing to undo':'Nothing to redo');return}
 hs.i=i;const v=[S.vx,S.vy,S.z,S.auto];loadData(JSON.parse(H[i]));[S.vx,S.vy,S.z,S.auto]=v;applyView();toast(d<0?'Undo':'Redo')}
['pointerup','keyup','change','click'].forEach(ev=>addEventListener(ev,()=>setTimeout(commit,0),true));

/* ===== drafting aids: GRID display, SNAP to grid, ORTHO (F7 / F9 / F8) ===== */
const STN={grid:'Grid',snap:'Snap',ortho:'Ortho'};
function stSync(){$$('#sts [data-st]').forEach(b=>b.setAttribute('aria-pressed',String(!!S[b.dataset.st])))}
function toggleSt(k){S[k]=S[k]?0:1;stSync();S.dirty=1;toast(STN[k]+(S[k]?' on':' off'))}
$('#sts').addEventListener('click',e=>{const b=e.target.closest('[data-st]');if(b)toggleSt(b.dataset.st)});stSync();

/* ===== ARRAY and SCALE (AutoCAD-style) ===== */
function arrayCmd(){const s=S.sel;if(!s||s.k==='w'){toast('Select a part or drawn object first');return}
 const v=prompt('ARRAY – rows, columns, row spacing (mm), column spacing (mm)','1, 3, 30, 40');if(!v)return;
 const[r,c,dy,dx]=v.split(/[ ,;]+/).map(Number);if(!(r>=1&&c>=1)||r*c>100||isNaN(dy)||isNaN(dx)){toast('Enter four numbers, e.g. 2, 3, 30, 40');return}
 const base=s,o=s.k==='c'?by(s.id):shp(s.id);if(!o)return;
 for(let i=0;i<r;i++)for(let j=0;j<c;j++){if(!i&&!j)continue;S.sel=base;dupSel();const n=S.sel.k==='c'?by(S.sel.id):shp(S.sel.id),X=j*dx*U,Y=i*dy*U;
  if(n.k==='line'){n.x1=o.x1+X;n.x2=o.x2+X;n.y1=o.y1+Y;n.y2=o.y2+Y}else{n.x=o.x+X;n.y=o.y+Y}if(S.sel.k==='c')clampC(n)}
 select(base);toast('Array: '+r*c+' copies')}
function scaleCmd(){const s=S.sel;if(!s||s.k==='w'){toast('Select a part or drawn object first');return}
 const v=parseFloat(prompt('SCALE – factor (1.5 = 150 %, 0.5 = 50 %)','1.5'));if(!(v>0))return;
 if(s.k==='c'){const c=by(s.id);if(D[c.type].us){toast('This item cannot be scaled');return}c.sc=Math.max(.4,Math.min(4,(c.sc||1)*v));clampC(c)}
 else{const q=shp(s.id);if(q.k==='circle')q.r*=v;else if(q.k==='line'){q.x2=q.x1+(q.x2-q.x1)*v;q.y2=q.y1+(q.y2-q.y1)*v}else if(q.k==='text')q.size=Math.max(6,Math.round(q.size*v));else{q.w*=v;q.h*=v}}
 props();S.dirty=1}

/* ===== AutoCAD-style ribbon: tabs + panels. Item = [id, label, icon]; id "tool:x" picks a drawing tool, "cmd:x" runs a command ===== */
const IC={
 move:'<path class=fl d="M7 3l12 8-5.4 1.6L11 18z"/>',line:'<path d="M5 20L20 5"/><circle cx=5 cy=20 r=1.8 class=fl /><circle cx=20 cy=5 r=1.8 class=fl />',
 circle:'<circle cx=12 cy=12 r=8.5 />',rect:'<rect x=4 y=6.5 width=16 height=11 />',text:'<path d="M5 20L12 4l7 16M8 14.5h8"/>',
 image:'<rect x=3.5 y=5 width=17 height=14 rx=1.8 /><circle cx=8.5 cy=10 r=1.6 /><path d="M4 18l5-5 3.4 3.2 2.6-2.4L20 17"/>',
 rotate:'<path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5M19.5 4v5h-5"/>',copy:'<rect x=8.5 y=8.5 width=11 height=11 rx=1.5 /><path d="M15.5 8.5V5.5a1.5 1.5 0 0 0-1.500-1.500h-8A1.500 1.500 0 0 0 4.500 5.500v8A1.500 1.500 0 0 0 6 15h2.500"/>',
 trash:'<path d="M4.5 7h15M9.500 7V4.500h5V7M6.500 7l1 13h9l1-13M10.500 11v5.500M13.500 11v5.500"/>',
 zin:'<circle cx=10.500 cy=10.500 r=6.500 /><path d="M15.500 15.500L20.500 20.500M10.500 7.500v6M7.500 10.500h6"/>',zout:'<circle cx=10.500 cy=10.500 r=6.500 /><path d="M15.500 15.500L20.500 20.500M7.500 10.500h6"/>',
 fit:'<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x=8.500 y=8.500 width=7 height=7 />',
 lib:'<rect x=4 y=4 width=7 height=7 rx=1 /><rect x=13 y=4 width=7 height=7 rx=1 /><rect x=4 y=13 width=7 height=7 rx=1 /><rect x=13 y=13 width=7 height=7 rx=1 />',
 props:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx=15 cy=7 r=2 /><circle cx=9 cy=17 r=2 />',
 res:'<rect x=3.500 y=5 width=17 height=14 rx=1.500 /><path d="M3.500 10h17M9.500 10v9"/>',tabs:'<path d="M4 9l8-4 8 4-8 4zM4 13l8 4 8-4M4 17l8 4 8-4"/>',
 printer:'<path d="M7 9V4h10v5M7 17H4.500v-7h15v7H17"/><rect x=7 y=14 width=10 height=6 />',pdf:'<path d="M6 3.500h8l4.500 4.500v12.500H6z M14 3.500V8h4.500"/><path d="M9 15h6M9 18h4"/>',
 sheet:'<rect x=4 y=4 width=16 height=16 /><path d="M4 16h16M13 16v4"/>',
 dim:'<path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3M4 6v12M20 6v12"/>',arrow:'<path d="M5 19L19 5M10 5h9v9"/>',undo:'<path d="M9 7l-5 5 5 5M4 12h10a6 6 0 0 1 0 8h-3"/>',redo:'<path d="M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 8h3"/>',
 array:'<rect x=3.500 y=3.500 width=6 height=6 /><rect x=14.500 y=3.500 width=6 height=6 /><rect x=3.500 y=14.500 width=6 height=6 /><rect x=14.500 y=14.500 width=6 height=6 />',scale:'<rect x=4 y=12 width=8 height=8 /><path d="M12 12l8-8M14 4h6v6"/>',
 grid:'<path d="M4 4h16v16H4zM4 9.300h16M4 14.700h16M9.300 4v16M14.700 4v16"/>',snap:'<circle cx=12 cy=12 r=3 /><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',ortho:'<path d="M5 19V5M5 19h14M5 12h6"/>'};
const RIB={
 Home:[['Draw',[['tool:line','Line','line'],['tool:circle','Circle','circle'],['tool:rect','Rectangle','rect'],['tool:arrow','Arrow','arrow']]],
  ['Modify',[['tool:sel','Move','move'],['cmd:rot','Rotate','rotate'],['cmd:dup','Copy','copy'],['cmd:array','Array','array'],['cmd:scale','Scale','scale'],['cmd:del','Erase','trash']]],
  ['Annotation',[['tool:text','Text','text'],['tool:dim','Dimension','dim'],['tool:img','Logo','image']]],
  ['Edit',[['cmd:undo','Undo','undo'],['cmd:redo','Redo','redo']]],
  ['Plot',[['cmd:plot','Plot','printer']]]],
 Insert:[['Block',[['cmd:lib','Components','lib']]],['Reference',[['tool:img','Logo / picture','image']]]],
 Annotate:[['Text',[['tool:text','Text','text']]],['Dimension',[['tool:dim','Dimension','dim'],['tool:arrow','Arrow / leader','arrow']]],['Draw',[['tool:line','Line','line'],['tool:circle','Circle','circle'],['tool:rect','Rectangle','rect']]]],
 View:[['Zoom',[['cmd:zin','Zoom in','zin'],['cmd:zout','Zoom out','zout'],['cmd:fit','Fit page','fit']]],
  ['Palettes',[['cmd:lib','Library','lib'],['cmd:props','Properties','props'],['cmd:res','Results','res'],['cmd:tabs','Sheet tabs','tabs']]],['Drafting aids',[['cmd:grid','Grid (F7)','grid'],['cmd:snap','Snap (F9)','snap'],['cmd:ortho','Ortho (F8)','ortho']]]],
 Output:[['Plot',[['cmd:plot','Plot','printer']]],['Page setup',[['sel:paper'],['cmd:setup','Sheet setup','sheet']]]]};
let ribTab='Home';
function ribbon(){$('#rtabs').innerHTML=Object.keys(RIB).map(k=>`<button role=tab aria-selected=${k===ribTab} data-rt=${k}>${k}</button>`).join('');
 $('#rbody').innerHTML=RIB[ribTab].map(([nm,its])=>`<div class=rp><div class=ri>`+its.map(it=>{
  if(it[0]==='sel:paper')return`<div class=rsel><label>Paper<select id=rPaper>${Object.keys(PAPER).map(p=>`<option ${S.tb.paper===p?'selected':''}>${p}</option>`).join('')}</select></label><label>Orientation<select id=rOrient><option value=L ${S.tb.orient!=='P'?'selected':''}>Landscape</option><option value=P ${S.tb.orient==='P'?'selected':''}>Portrait</option></select></label></div>`;
  const[id,lb,ic]=it,[kd,v]=id.split(':');return`<button class=rb ${kd==='tool'?`data-tool=${v} aria-pressed=${S.tool===v}`:`data-cmd=${v}`} title="${lb}"><svg viewBox="0 0 24 24">${IC[ic]}</svg><span>${lb}</span></button>`}).join('')+`</div><div class=rn>${nm}</div></div>`).join('');
 const s=S.sel;$$('#ribbon [data-cmd=rot]').forEach(b=>b.disabled=!s||s.k=='w');$$('#ribbon [data-cmd=dup],#ribbon [data-cmd=del]').forEach(b=>b.disabled=!s)}
$('#rtabs').addEventListener('click',e=>{const b=e.target.closest('[data-rt]');if(b){ribTab=b.dataset.rt;ribbon()}});
$('#rbody').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.tool){const t=b.dataset.tool;if(t==='img'){pickImage(null);return}setTool(S.tool===t&&t!=='sel'?'sel':t);return}
 const c=b.dataset.cmd;if(!c)return;
 ({rot:()=>doAct('rot'),dup:()=>doAct('dup'),del:()=>doAct('del'),plot:openPlot,setup:openTB,fit,zin:()=>$('#zIn').click(),zout:()=>$('#zOut').click(),
  lib:()=>panel('hl'),props:()=>panel('hr'),res:()=>panel('hf'),tabs:()=>panel('hp'),undo:()=>hgo(-1),redo:()=>hgo(1),array:arrayCmd,scale:scaleCmd,grid:()=>toggleSt('grid'),snap:()=>toggleSt('snap'),ortho:()=>toggleSt('ortho')})[c]()});
$('#rbody').addEventListener('change',e=>{const t=e.target;if(t.id==='rPaper'){S.tb.paper=t.value;fit()}if(t.id==='rOrient'){S.tb.orient=t.value;fit()}S.dirty=1});


/* ===== AutoCAD-style command line: type a letter (L, C, T, RO, E, PLOT ...) and pick from the suggestions ===== */
const CMDS=[
 {n:'Line',a:['l','line'],h:'draw a line',f:()=>setTool('line')},{n:'Circle',a:['c','circle'],h:'draw a circle',f:()=>setTool('circle')},
 {n:'Rectangle',a:['rec','rect','rectang','box'],h:'draw a rectangle',f:()=>setTool('rect')},{n:'Text',a:['t','text','mtext'],h:'add text',f:()=>setTool('text')},
 {n:'Logo / picture',a:['im','image','logo'],h:'insert a picture',f:()=>pickImage(null)},
 {n:'Move',a:['m','move'],h:'select and drag',f:()=>setTool('sel')},{n:'Rotate',a:['ro','r','rotate'],h:'rotate selection',f:()=>doAct('rot')},
 {n:'Copy',a:['co','cp','copy'],h:'duplicate selection',f:()=>doAct('dup')},{n:'Erase',a:['e','del','erase','delete'],h:'delete selection',f:()=>doAct('del')},
 {n:'Zoom in',a:['zi'],h:'',f:()=>$('#zIn').click()},{n:'Zoom out',a:['zo'],h:'',f:()=>$('#zOut').click()},{n:'Zoom extents (fit page)',a:['z','ze','fit','zoom'],h:'',f:fit},
 {n:'Plot / Print',a:['plot','print','pdf','p'],h:'paper size & orientation',f:openPlot},{n:'Sheet setup',a:['setup','pagesetup','ps'],h:'',f:openTB},
 {n:'Run simulation',a:['run','go'],h:'',f:()=>$('#bRun').click()},{n:'Pause simulation',a:['pause'],h:'',f:()=>$('#bPause').click()},{n:'Stop simulation',a:['stop','s'],h:'',f:()=>$('#bStop').click()},
 {n:'Component library',a:['lib','library'],h:'show / hide',f:()=>panel('hl')},{n:'Properties',a:['pr','prop','properties'],h:'show / hide',f:()=>panel('hr')},{n:'Save in browser',a:['save','qsave'],h:'',f:()=>$('#bSave').click()},
 {n:'Dimension',a:['dim','dli','dimension'],h:'measure a length',f:()=>setTool('dim')},{n:'Arrow / leader',a:['le','leader','arrow'],h:'arrow with tail',f:()=>setTool('arrow')},
 {n:'Undo',a:['u','undo'],h:'Ctrl+Z',f:()=>hgo(-1)},{n:'Redo',a:['redo'],h:'Ctrl+Y',f:()=>hgo(1)},{n:'Array',a:['ar','array'],h:'rows × columns of copies',f:arrayCmd},{n:'Scale',a:['sc','scale'],h:'resize selection',f:scaleCmd},
 {n:'Ortho on / off',a:['ortho','f8'],h:'straight lines only',f:()=>toggleSt('ortho')},{n:'Snap on / off',a:['snap','f9'],h:'snap to grid',f:()=>toggleSt('snap')},{n:'Grid on / off',a:['grid','f7'],h:'show / hide grid',f:()=>toggleSt('grid')}];
Object.keys(D).forEach(t=>CMDS.push({n:D[t].n,a:[],h:'place component',t,f:()=>place(t),ds:(D[t].ds||'').toLowerCase(),comp:1}));
let lastCmd=null,sug=[],sugI=0;const cmdIn=$('#cmdIn'),cmdSug=$('#cmdSug');
function cmdFind(q){q=q.trim().toLowerCase();if(!q)return[];const o=[];
 CMDS.forEach((c,i)=>{const nm=c.n.toLowerCase();let s=-1;
  if(c.a.includes(q))s=0;else if(c.a.some(a=>a.startsWith(q)))s=1;else if(nm.startsWith(q))s=2;else if(nm.split(/[^a-z0-9]+/).some(w=>w.startsWith(q)))s=3;else if(q.length>1&&(nm.includes(q)||(c.ds||'').includes(q)))s=4;
  if(s>=0)o.push({c,s:s+(c.comp?10:0),i})});
 return o.sort((a,b)=>a.s-b.s||a.i-b.i).slice(0,8).map(x=>x.c)}
function cmdDraw(){const q=cmdIn.value.trim();sug=cmdFind(q);sugI=Math.min(sugI,Math.max(0,sug.length-1));
 cmdSug.innerHTML=sug.map((c,i)=>{const nm=esc(c.n),ql=q.length,pre=c.n.toLowerCase().startsWith(q.toLowerCase())?`<b>${esc(c.n.slice(0,ql))}</b>${esc(c.n.slice(ql))}`:nm,al=c.a[0]?`<kbd>${c.a[0].toUpperCase()}</kbd>`:'';
  return`<div class="sg${i===sugI?' on':''}" data-i=${i}><span>${pre}</span><small>${c.comp?'Place':esc(c.h)}</small>${al}</div>`}).join('')||(q?'<div class=sg><span class=mu>No matching command</span></div>':'');
 cmdSug.classList.toggle('show',!!q)}
function cmdOpen(ch){cmdIn.value=ch;sugI=0;cmdIn.focus();cmdDraw()}
function cmdClose(){cmdIn.value='';cmdSug.classList.remove('show');cmdIn.blur()}
function cmdRun(c){cmdClose();if(!c)return;lastCmd=c.comp?null:c;try{c.f()}catch(_){}S.dirty=1;toast('Command: '+c.n)}
cmdIn.addEventListener('input',()=>{sugI=0;cmdDraw()});
cmdIn.addEventListener('keydown',e=>{e.stopPropagation();
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(sug.length){sugI=(sugI+(e.key==='ArrowDown'?1:sug.length-1))%sug.length;cmdDraw()}}
 else if(e.key==='Enter'||e.key===' '&&sug.length===1){e.preventDefault();cmdRun(sug[sugI])}
 else if(e.key==='Tab'){e.preventDefault();if(sug[sugI]){cmdIn.value=sug[sugI].n;cmdDraw()}}
 else if(e.key==='Escape'){cmdClose()}});
cmdIn.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==cmdIn)cmdSug.classList.remove('show')},120));
cmdSug.addEventListener('pointerdown',e=>{const r=e.target.closest('[data-i]');if(r){e.preventDefault();cmdRun(sug[+r.dataset.i])}});

/* ===== start-up: demo circuit and main loop ===== */
(()=>{const v=add('dc',150,300),fu=add('fus',300,180),sw=add('sw',480,180),lp=add('lamp',660,300);sw.s.on=1;sw.label='S1';
 conn(v.id+'.0',fu.id+'.0');conn(fu.id+'.1',sw.id+'.0');conn(sw.id+'.1',lp.id+'.0');conn(lp.id+'.1',v.id+'.1')})();
const ghostMarkup=()=>{if(!S.ghost)return'';const c=mk(S.ghost.type,S.ghost.x,S.ghost.y);return`<g opacity=.7 style="pointer-events:none">${compSVG(c,false,true)}</g>`};
buildLib();renderTabs();props();tbl();ribbon();fit();commit();
let last=0,lt=0,sheetKey='';
(function loop(t){if(S.run&&!S.pause&&t-last>=20){last=t;tick();$('#stat').textContent='RUNNING · t='+S.time.toFixed(1)+'s'}
 if(S.dirty||S.run){const d=S.dirty;S.dirty=0;lmap();const sk=S.tb.paper+S.tb.orient+S.tb.frame+S.grid;if(sk!==sheetKey){sheetKey=sk;gS.innerHTML=sheetMarkup(pidx(),false)}gD.innerHTML=pageMarkup(S.pg,true)+ghostMarkup();if(t-lt>(drag?400:150)||(d&&!drag)){lt=t;tbl()}}
 if(typeof plcLive==='function')plcLive(t);
 if(typeof hmidLive==='function')hmidLive(t);
 requestAnimationFrame(loop)})(0);
