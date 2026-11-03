/* ElectroSim v8.20 – HMI Designer (phase 3: process graphics). Loaded after hmi.js; opened by double-clicking an HMI panel or from its Properties.
   Layout like an industrial HMI tool: screen list + widget palette (left) · screen canvas with grid + snap (centre) · inspector (right).
   Screens: add / rename (double-click) / duplicate / delete / reorder; the first screen is "home". An alarm screen (＋ Alarms) shows the alarm list.
   Design mode: click to select, drag to move, drag the corner handle to resize, arrows nudge, Del deletes, Ctrl+D duplicates.
   Simulate mode: the widgets, navigation buttons, banner and alarm list work like on the real panel (needs ▶ Run and the PLC in RUN for PLC data).
   Widget positions are in pixels of the CONTENT area, i.e. below the header bar (HD.hh). The design is stored in c.hd (see hmi.js).
   Phase 3 (hmip.js): process symbols + trend in the palette; the inspector of every widget has Animation rules, and numeric widgets have Limits.
   Roadmap: phase 4 tag table, numeric entry, PDF export of the screens. */
'use strict';
let hdDlg=null,hdLast=0,hdClk=0;                                    /* HD (the open designer) is declared in hmi.js */
const HDG=8;                                                          /* snap grid in screen pixels */
const HPAL=[['btn','▣','Push button'],['sw','⬭','Toggle switch'],['lamp','●','Lamp'],['num','#','Numeric display'],['bar','▰','Bar graph'],['txt','T','Text'],['rect','▢','Panel'],['nav','➜','Navigation']];
const hdD=()=>hmiDesign(HD.c);
const hdScr=()=>{const d=hdD();return d.screens.find(q=>q.id===HD.scr)||d.screens[0]};
const hdIt=()=>hdScr().items.find(q=>q.id===HD.sel);
const hdG=()=>hmiGeom(hdD(),hdScr());
const hdSn=v=>HD.snap?Math.round(v/HDG)*HDG:Math.round(v);
const hdChg=()=>{S.dirty=1};
const hdDone=()=>{S.dirty=1;commit()};

function hdAddrs(it){const P=hmiPlc(HD.c);if(!P)return[];const A=plAdrs(P),k=it.k,g=k==='btn'||k==='sw'?[].concat(A.I,A.M):k==='lamp'?[].concat(A.Q,A.M,A.I,A.T,A.C):[].concat(A.AI,A.AO,A.T,A.C,A.Q,A.M,A.I);
 return g.map(a=>[a,plTag(P,a)])}
function hdSel(k,cur,opts){return`<select data-f=${k}>${opts.map(o=>{const v=Array.isArray(o)?o[0]:o,t=Array.isArray(o)?o[1]:o;return`<option value="${esc(v)}" ${String(v)===String(cur)?'selected':''}>${esc(t)}</option>`}).join('')}</select>`}
const hdNum=(k,v,l,mn)=>`<label>${l}<input type=number data-f=${k} value="${v}" ${mn!=null?'min='+mn:''} step=1></label>`;

/* keep every widget inside its screen's content area (after the header / banner / panel size changed) */
function hdClampAll(){const d=hdD();d.screens.forEach(s=>{const G=hmiGeom(d,s);s.items.forEach(it=>{it.w=Math.max(24,Math.min(s.w,it.w));it.h=Math.max(16,Math.min(G.ch,it.h));it.x=Math.max(0,Math.min(s.w-it.w,it.x));it.y=Math.max(0,Math.min(G.ch-it.h,it.y))})})}

/* ---------- screen list ---------- */
function hdScrList(){const d=hdD(),el=document.getElementById('hdScrL');if(!el)return;
 el.innerHTML=d.screens.map((q,i)=>`<div class="si${q.id===HD.scr?' on':''}" data-s=${q.id} title="${i?'':'Home screen (the Navigation “Home” button goes here). '}Double-click to rename"><i>${i===0?'⌂':q.kind==='alarm'?'⚠':'▭'}</i><span>${esc(q.name)}</span></div>`).join('')}
function hdSelScr(id){const d=hdD();if(!d.screens.some(q=>q.id===id))return;HD.scr=id;d.ed=id;HD.sel=null;if(HD.mode==='sim'){HD.c.s.sc=id;HD.c.s.bk=[]}hdScrList();hdCanvas();hdProps()}
function hdSAdd(alarm){hdDesignMode();const d=hdD(),b=hdScr(),s={id:d.sid++,name:alarm?'Alarms':'Screen '+(d.screens.length+1),kind:alarm?'alarm':'n',w:b.w,h:b.h,bg:b.bg,items:[]};
 d.screens.push(s);
 if(alarm){const G=hmiGeom(d,s),n=hmiNew('nav',0,0);n.id=d.nid++;n.nv='back';n.l='BACK';n.c='Grey';n.w=120;n.h=40;n.x=8;n.y=Math.max(0,G.ch-n.h-4);s.items.push(n)}
 hdSelScr(s.id);hdDone()}
function hdSDup(){hdDesignMode();const d=hdD(),s=hdScr(),i=d.screens.indexOf(s),n=Object.assign({},s,{id:d.sid++,name:s.name+' copy',items:s.items.map(it=>Object.assign(hmipClone(it),{id:d.nid++}))});
 d.screens.splice(i+1,0,n);hdSelScr(n.id);hdDone()}
function hdSDel(){hdDesignMode();const d=hdD(),s=hdScr();if(d.screens.length<2){toast('A panel needs at least one screen');return}
 if((s.items.length||s.kind==='alarm')&&!confirm('Delete the screen “'+s.name+'” and its '+s.items.length+' widget'+(s.items.length===1?'':'s')+'?'))return;
 const i=d.screens.indexOf(s);d.screens.splice(i,1);d.screens.forEach(q=>q.items.forEach(it=>{if(it.k==='nav'&&it.nv==='go'&&+it.to===s.id)it.to=0}));
 hdSelScr(d.screens[Math.min(i,d.screens.length-1)].id);hdDone()}
function hdSMove(dir){hdDesignMode();const d=hdD(),s=hdScr(),i=d.screens.indexOf(s),j=i+dir;if(j<0||j>=d.screens.length)return;
 d.screens.splice(i,1);d.screens.splice(j,0,s);hdScrList();hdDone()}
function hdSRename(row){const id=+row.dataset.s,s=hdD().screens.find(q=>q.id===id),sp=row.querySelector('span');if(!s||!sp)return;
 const inp=document.createElement('input');inp.type='text';inp.value=s.name;inp.className='ren';sp.replaceWith(inp);inp.focus();inp.select();let fin=0;
 const end=ok=>{if(fin)return;fin=1;if(ok&&inp.value.trim()){s.name=inp.value.trim();hdDone()}hdScrList();hdCanvas();hdProps()};
 inp.addEventListener('blur',()=>end(1));inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')end(1);else if(e.key==='Escape')end(0)})}
function hdDesignMode(){if(HD.mode!=='design')hdMode('design')}

/* ---------- inspector ---------- */
function hdChecks(){const el=document.getElementById('hdChk');if(!el)return;const w=D.hmi.msg(HD.c);el.innerHTML=w.length?w.map(m=>`<p class="hw">${esc(m[1])}</p>`).join(''):'<p class=mu>No problems found.</p>'}
function hdProps(){const el=document.getElementById('hdPr'),c=HD.c,s=hdScr(),d=hdD(),it=hdIt(),P=hmiPlc(c);let h;
 if(!it){const sz=Object.keys(HSZ).find(k=>HSZ[k][0]===s.w&&HSZ[k][1]===s.h)||Object.keys(HSZ)[0],bg=Object.keys(HBG).find(k=>HBG[k]===s.bg)||'Navy',H=d.hdr,
   A=P?plAdrs(P):null,ads=A?[].concat(A.I,A.Q,A.M,A.T,A.C):[];
  h=`<h4>Screen</h4><label>Name<input type=text data-f=sname value="${esc(s.name)}"></label><label>Panel size (all screens)${hdSel('size',sz,Object.keys(HSZ))}</label><label>Background (this screen)${hdSel('bg',bg,Object.keys(HBG))}</label>
  <label>Linked PLC${hdSel('plc',c.p.plc,['Auto (first PLC)',...hmiPlcs().map(q=>q.label)])}</label>
  <label class=ck><input type=checkbox data-f=grid ${HD.grid?'checked':''}>Show grid</label><label class=ck><input type=checkbox data-f=snap ${HD.snap?'checked':''}>Snap to grid (${HDG} px)</label>
  <h4>Header bar (every screen)</h4><label class=ck><input type=checkbox data-f=hon ${H.on?'checked':''}>Show header bar</label>`+
  (H.on?`<label>Title<input type=text data-f=ht value="${esc(H.t)}" placeholder="${esc(c.label)}"></label><label class=ck><input type=checkbox data-f=hsn ${H.sn?'checked':''}>Current screen name</label><label class=ck><input type=checkbox data-f=hdt ${H.dt?'checked':''}>Date and time</label><label>Accent colour${hdSel('hc',H.c,Object.keys(HCOL))}</label>`:'')+
  `<h4>Alarms</h4><label class=ck><input type=checkbox data-f=ban ${d.ban?'checked':''}>Banner with the newest alarm (every screen except the alarm screen)</label>
  <datalist id=hdAdA>${ads.map(a=>`<option value="${a}">${esc(plTag(P,a))}</option>`).join('')}</datalist>
  <div id=hdAl>${d.al.map(a=>hdAlRow(a)).join('')}</div>
  <div class=row><button data-op=aadd>＋ Add alarm</button></div>
  <p class=mu>An alarm is raised when its PLC bit turns on (I, Q, M bit, timer or counter). Alarms are listed, acknowledged and logged on an alarm screen: add one with <b>＋ Alarms</b> on the left.${P?'':' <b>No PLC in the project.</b>'}</p>
  <h4>Checks</h4><div id=hdChk></div>
  <p class=mu>${s.items.length} widget${s.items.length===1?'':'s'} on this screen. Click a widget in the palette to add it, then drag it into place. Select a widget to edit it.</p>`}
 else{const k=it.k,wr=k==='btn'||k==='sw',pl=k!=='rect'&&k!=='txt'&&k!=='nav'&&k!=='sym'&&k!=='trend',vs=k==='sym'&&HSYM[HSYM[it.sy]?it.sy:'tank'].val,ad=hdAddrs(it),d2=hdD();
  h=`<h4>${HK[k]}</h4>`+(pl?`<label>PLC address<input type=text data-f=a value="${esc(it.a)}" list=hdAd autocomplete=off placeholder="${wr?'M0.0':k==='lamp'?'Q0.0':'AI0'}"></label><datalist id=hdAd>${ad.map(q=>`<option value="${q[0]}">${esc(q[1])}</option>`).join('')}</datalist>
   <p class=mu style="margin:-2px 0 4px">${wr?'Writes an I or M bit.':k==='lamp'?'Shows any bit.':'Shows AI / AO (%), a timer (s), a counter, or a bit.'}${P?'':' <b>No PLC in the project.</b>'}</p>`:'')+
  `<label>${k==='txt'?'Text':k==='rect'?'Title':'Text on screen'}<input type=text data-f=l value="${esc(it.l)}"></label>`+hmipPr(it)+
  (k==='nav'?`<label>Action${hdSel('nv',it.nv||'go',[['go','Go to screen'],['back','Back (previous screen)'],['home','Home (first screen)']])}</label>`+
    ((it.nv||'go')==='go'?`<label>Target screen${hdSel('to',it.to,[['0','— choose —'],...d2.screens.map(q=>[String(q.id),q.name])])}</label>`:''):'')+
  (k==='rect'?'':`<div class=two><label>Colour${hdSel('c',it.c,Object.keys(HCOL))}</label>${k==='bar'?'':hdNum('fs',it.fs,'Font size',6)}</div>`)+
  (k==='num'?`<label>Decimals${hdSel('dp',it.dp==null?'':it.dp,[['','Auto'],'0','1','2'])}</label>`:'')+
  (k==='bar'||vs?`<div class=two>${hdNum('mn',it.mn,'Min')}${hdNum('mx',it.mx,'Max')}</div>`:'')+(k==='num'||k==='bar'||k==='trend'||vs?hmipLimPr(it):'')+hmipAnPr(it)+
  `<h4>Position and size</h4><div class=two>${hdNum('x',it.x,'X',0)}${hdNum('y',it.y,'Y',0)}</div><div class=two>${hdNum('w',it.w,'Width',24)}${hdNum('h',it.h,'Height',16)}</div>
  <div class=row><button data-op=front title="Bring to front">⤒ Front</button><button data-op=back title="Send to back">⤓ Back</button><button data-op=dup title="Duplicate (Ctrl+D)">⧉ Copy</button><button data-op=del class=dn title="Delete (Del)">🗑 Delete</button></div>`+hmipDatalist(P)}
 el.innerHTML=h;if(!it)hdChecks()}
const hdAlRow=a=>`<div class=al style="border-left-color:${hmiPri(a.p)[1]}" data-al=${a.id}><input type=text data-af=a value="${esc(a.a)}" list=hdAdA autocomplete=off placeholder="M1.0" aria-label="PLC bit"><select data-af=p aria-label="Priority">${[1,2,3].map(p=>`<option value=${p} ${+a.p===p?'selected':''}>${HPRI[p][0]}</option>`).join('')}</select><button data-op=adel data-id=${a.id} class=dn title="Remove alarm" aria-label="Remove alarm">×</button><input type=text class=wide data-af=t value="${esc(a.t)}" placeholder="Alarm text" aria-label="Alarm text"></div>`;
function hdSyncPos(){const it=hdIt();if(!it)return;['x','y','w','h'].forEach(k=>{const i=document.querySelector('#hdPr [data-f='+k+']');if(i&&document.activeElement!==i)i.value=it[k]})}

/* ---------- canvas ---------- */
function hdFit(){const cv=document.getElementById('hdCv'),s=hdScr();HD.z=Math.max(.3,Math.min(2,Math.min((cv.clientWidth-48)/s.w,(cv.clientHeight-48)/s.h)));hdCanvas()}
function hdCanvas(){const s=hdScr(),sv=document.getElementById('hdSvg'),z=HD.z,G=hdG(),gr=sv.querySelector('#hdGr');
 sv.setAttribute('viewBox',`0 0 ${s.w} ${s.h}`);sv.setAttribute('width',Math.round(s.w*z));sv.setAttribute('height',Math.round(s.h*z));
 sv.querySelector('#hdBg').setAttribute('style','fill:'+s.bg);gr.style.display=HD.grid?'':'none';gr.setAttribute('transform',`translate(0 ${G.hh})`);gr.setAttribute('width',s.w);gr.setAttribute('height',G.ch);
 document.getElementById('hdZ').textContent=Math.round(z*100)+' %';hdItems();hdSelBox()}
function hdItems(){const s=hdScr(),g=document.getElementById('hdItems'),G=hdG(),sim=HD.mode==='sim';
 g.innerHTML=hmiScreenSVG(HD.c,sim)+(!sim&&!s.items.length&&s.kind!=='alarm'?`<text x=${s.w/2} y=${G.hh+G.ch/2} style="font:600 14px Arial;fill:#6f8ba3;text-anchor:middle">Click a widget in the palette to add it</text>`:'')}
function hdSelBox(){const it=hdIt(),g=document.getElementById('hdSel');g.setAttribute('transform',`translate(0 ${hdG().hh})`);
 g.innerHTML=!it||HD.mode!=='design'?'':`<rect x=${it.x-1} y=${it.y-1} width=${it.w+2} height=${it.h+2} style="fill:none;stroke:#4aa3ff;stroke-width:${1.5/HD.z};stroke-dasharray:${5/HD.z} ${3/HD.z};pointer-events:none"/>`+
  `<rect data-rh=1 x=${it.x+it.w-6/HD.z} y=${it.y+it.h-6/HD.z} width=${12/HD.z} height=${12/HD.z} style="fill:#4aa3ff;stroke:#fff;stroke-width:${1/HD.z};cursor:nwse-resize"/>`+
  `<text x=${it.x} y=${Math.max(10/HD.z,it.y-5/HD.z)} style="font:600 ${10/HD.z}px Arial;fill:#4aa3ff;pointer-events:none">${it.x}, ${it.y} · ${it.w} × ${it.h}</text>`}
const hdPt=e=>{const r=document.getElementById('hdSvg').getBoundingClientRect(),s=hdScr();return[(e.clientX-r.left)*s.w/r.width,(e.clientY-r.top)*s.h/r.height-hdG().hh]};

function hdMode(m){HD.mode=m;if(m==='sim'){HD.sel=null;HD.c.s.sc=HD.scr;HD.c.s.bk=[];if(HD.c.s.al){HD.c.s.al.tab='a';HD.c.s.al.off=0}}
 hdDlg.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===m));hdDlg.classList.toggle('sim',m==='sim');hdProps();hdItems();hdSelBox()}
function hdSelect(id){HD.sel=id;hdProps();hdSelBox()}
function hdAdd(k0){const[k,sy]=String(k0).split(':'),s=hdScr(),d=hdD(),G=hdG(),n=hmiNew(k,0,0,sy),o=(s.items.length%8)*16;
 n.id=d.nid++;n.x=hdSn(Math.min(s.w-n.w,24+o+(k==='rect'?0:16)));n.y=hdSn(Math.min(G.ch-n.h,16+o));
 if(k==='rect')s.items.unshift(n);else s.items.push(n);
 if(k==='btn'||k==='sw')n.a='M0.'+Math.min(7,s.items.filter(q=>q.k==='btn'||q.k==='sw').length-1);
 if(k==='nav'){const o2=d.screens.find(q=>q.id!==s.id);if(o2){n.to=o2.id;n.l=hmiClip(o2.name.toUpperCase(),14)}}
 hdSelect(n.id);hdItems();hdDone()}
function hdDel(){const s=hdScr(),i=s.items.findIndex(q=>q.id===HD.sel);if(i<0)return;s.items.splice(i,1);HD.sel=null;hdProps();hdItems();hdSelBox();hdDone()}
function hdDup(){const s=hdScr(),it=hdIt(),G=hdG();if(!it)return;const n=Object.assign(hmipClone(it),{id:hdD().nid++,x:Math.min(s.w-it.w,it.x+16),y:Math.min(G.ch-it.h,it.y+16)});s.items.push(n);hdSelect(n.id);hdItems();hdDone()}
function hdOrder(front){const s=hdScr(),i=s.items.findIndex(q=>q.id===HD.sel);if(i<0)return;const[n]=s.items.splice(i,1);front?s.items.push(n):s.items.unshift(n);hdItems();hdDone()}
function hdMove(it,x,y){const s=hdScr(),G=hdG();it.x=Math.max(0,Math.min(s.w-it.w,x));it.y=Math.max(0,Math.min(Math.max(0,G.ch-it.h),y))}

function hdDown(e){if(e.button>0)return;const s=hdScr(),t=e.target,hi=t.closest&&t.closest('[data-hi]'),id=hi?+hi.dataset.hi:null,it=id!=null?s.items.find(q=>q.id===id):null,c=HD.c;
 if(HD.mode==='sim'){const ck=t.closest&&t.closest('[data-clk]');if(!ck)return;const a=ck.dataset.clk;
  if(/^p\d+$/.test(a)){if(!S.run){toast('Press ▶ Run first');return}c.s.hp=+a.slice(1);HD.hold=1;document.getElementById('hdSvg').setPointerCapture(e.pointerId)}
  else D.hmi.clk(c,a,1);
  hdChg();hdItems();return}
 const[px,py]=hdPt(e);e.preventDefault();
 if(t.dataset&&t.dataset.rh&&HD.sel!=null){const q=hdIt();HD.drag={m:'size',it:q,px,py,w:q.w,h:q.h}}
 else if(it){hdSelect(it.id);HD.drag={m:'move',it,px,py,x:it.x,y:it.y,moved:0}}
 else hdSelect(null);
 if(HD.drag)document.getElementById('hdSvg').setPointerCapture(e.pointerId)}
function hdDrag(e){const d=HD.drag;if(!d)return;const[px,py]=hdPt(e),it=d.it,s=hdScr(),G=hdG();d.moved=1;
 if(d.m==='move')hdMove(it,hdSn(d.x+px-d.px),hdSn(d.y+py-d.py));
 else{it.w=Math.max(24,Math.min(s.w-it.x,hdSn(d.w+px-d.px)));it.h=Math.max(16,Math.min(G.ch-it.y,hdSn(d.h+py-d.py)))}
 hdItems();hdSelBox();hdSyncPos();hdChg()}
function hdUp(){if(HD&&HD.hold){HD.hold=0;HD.c.s.hp=0;hdChg()}if(HD&&HD.drag){const m=HD.drag.moved;HD.drag=null;if(m)hdDone()}}

/* ---------- window ---------- */
function hmidOpen(c){const d0=hmiDesign(c);HD={c,sel:null,scr:d0.screens.some(q=>q.id===d0.ed)?d0.ed:d0.screens[0].id,mode:'design',z:1,grid:true,snap:true,drag:null,hold:0};
 if(!hdDlg){hdDlg=document.createElement('dialog');hdDlg.id='dHMI';document.body.appendChild(hdDlg);
  hdDlg.innerHTML=`<div class=hh><b id=hdT></b><div class=seg><button data-m=design class=on title="Edit the screens">✎ Design</button><button data-m=sim title="Try the screens with the simulation">▶ Simulate</button></div><span class=sp></span><span id=hdSt></span><button data-op=run title="Run simulation">▶ Run</button><button data-op=stop title="Stop">■ Stop</button><button data-op=close class=pri>Close</button></div>
   <div class=hb><div id=hdPal class=hpal><div class=hscr><h4>Screens</h4><div id=hdScrL class=hsl></div>
     <div class=hst><button data-op=sadd title="Add a screen">＋ Screen</button><button data-op=saal title="Add an alarm list screen">＋ Alarms</button></div>
     <div class=hst><button data-op=sdup title="Duplicate screen">⧉</button><button data-op=sup title="Move up">▲</button><button data-op=sdn title="Move down">▼</button><button data-op=sdel class=dn title="Delete screen">🗑</button></div></div>
    <div class=hwid><h4>Widgets</h4>${HPAL.map(p=>`<button data-add=${p[0]} title="Add ${p[2]}"><i>${p[1]}</i><span>${p[2]}</span></button>`).join('')}</div><div class=hwid><h4>Process symbols</h4><div class=hsym>${Object.keys(HSYM).map(k=>`<button data-add=sym:${k} title="Add ${HSYM[k].n}"><svg viewBox="0 0 20 20" aria-hidden=true>${HSYI[k]}</svg><span>${HSYM[k].n}</span></button>`).join('')}<button data-add=trend title="Add trend chart"><svg viewBox="0 0 20 20" aria-hidden=true>${HSYI.trend}</svg><span>Trend</span></button></div></div></div>
   <div id=hdCv class=hcv><div class=hz><button data-op=zo aria-label="Zoom out">−</button><span id=hdZ>100 %</span><button data-op=zi aria-label="Zoom in">+</button><button data-op=zf>Fit</button></div>
    <svg id=hdSvg xmlns="http://www.w3.org/2000/svg"><defs><pattern id=hdGp width=16 height=16 patternUnits=userSpaceOnUse><circle cx=0 cy=0 r=.9 style="fill:rgba(255,255,255,.22)"/><circle cx=16 cy=0 r=.9 style="fill:rgba(255,255,255,.22)"/><circle cx=0 cy=16 r=.9 style="fill:rgba(255,255,255,.22)"/><circle cx=16 cy=16 r=.9 style="fill:rgba(255,255,255,.22)"/></pattern></defs>
     <rect id=hdBg width=100% height=100%></rect><rect id=hdGr width=100% height=100% style="fill:url(#hdGp);pointer-events:none"></rect><g id=hdItems></g><g id=hdSel></g></svg></div>
   <div id=hdPr class=hpr></div></div>`;
  hdDlg.addEventListener('click',e=>{if(!HD)return;const si=e.target.closest('.si'),o=e.target.closest('[data-op]'),a=e.target.closest('[data-add]'),m=e.target.closest('[data-m]');
   if(si){if(e.target.tagName!=='INPUT')hdSelScr(+si.dataset.s);return}
   if(a&&HD.mode==='design'){hdAdd(a.dataset.add);return}if(a){hdMode('design');hdAdd(a.dataset.add);return}if(m){hdMode(m.dataset.m);return}if(!o)return;const k=o.dataset.op;
   if(k==='close')hdDlg.close();else if(k==='run')document.getElementById('bRun').click();else if(k==='stop')document.getElementById('bStop').click();
   else if(k==='zi'){HD.z=Math.min(3,HD.z*1.25);hdCanvas()}else if(k==='zo'){HD.z=Math.max(.3,HD.z/1.25);hdCanvas()}else if(k==='zf')hdFit();
   else if(k==='front')hdOrder(1);else if(k==='back')hdOrder(0);else if(k==='dup')hdDup();else if(k==='del')hdDel();
   else if(k==='sadd')hdSAdd(0);else if(k==='saal')hdSAdd(1);else if(k==='sdup')hdSDup();else if(k==='sdel')hdSDel();else if(k==='sup')hdSMove(-1);else if(k==='sdn')hdSMove(1);
   else if(k==='aadd'){const d=hdD(),n=d.al.length;d.al.push({id:d.aid++,a:'M1.'+(n%8),t:'Alarm '+(n+1),p:n?2:1});hdProps();hdItems();hdDone()}
   else if(k==='adel'){const d=hdD();d.al=d.al.filter(q=>q.id!==+o.dataset.id);hdProps();hdItems();hdDone()}
   else if(k==='nadd'){const it=hdIt();if(it){(it.an=it.an||[]).push(hmipRuleNew(document.getElementById('hdAnT').value));hdProps();hdItems();hdDone()}}
   else if(k==='ndel'){const it=hdIt();if(it&&it.an){it.an.splice(+o.dataset.i,1);if(!it.an.length)delete it.an;hdProps();hdItems();hdDone()}}
   else if(k==='padd'){const it=hdIt();if(it&&it.pens&&it.pens.length<HTRM){it.pens.push({a:'',c:Object.keys(HCOL)[(it.pens.length*2)%7]});hdProps();hdItems();hdDone()}}
   else if(k==='pdel'){const it=hdIt();if(it&&it.pens){it.pens.splice(+o.dataset.i,1);hdProps();hdItems();hdDone()}}});
  hdDlg.addEventListener('dblclick',e=>{const si=e.target.closest('.si');if(HD&&si&&e.target.tagName!=='INPUT'){hdDesignMode();hdSRename(si)}});
  const sv=hdDlg.querySelector('#hdSvg');sv.addEventListener('pointerdown',hdDown);sv.addEventListener('pointermove',hdDrag);sv.addEventListener('pointerup',hdUp);sv.addEventListener('pointercancel',hdUp);
  /* alarm definition rows */
  const edAl=e=>{const t=e.target,f=t.dataset&&t.dataset.af;if(!HD||!f)return false;const row=t.closest('[data-al]'),a=hdD().al.find(q=>q.id===+(row&&row.dataset.al));if(!a)return true;const isChg=e.type==='change';
   if(f==='p')a.p=+t.value;else if(f==='a')a.a=isChg?hmiAd(t.value):t.value;else a.t=t.value;
   if(isChg){if(f==='a')t.value=a.a;if(f==='p')row.style.borderLeftColor=hmiPri(a.p)[1];hdChecks();hdDone()}else hdChg();hdItems();return true};
  const edRow=e=>{const t=e.target,pf=t.dataset.pf,f=t.dataset.nf||pf,it=hdIt(),row=t.closest('[data-ri]');if(!it||!row)return true;const L=pf?it.pens:it.an,q=L&&L[+row.dataset.ri];if(!q)return true;const isChg=e.type==='change';
   if(f==='a')q.a=isChg?hmiAd(t.value):t.value;else if(/^(sp|dx|dy|mn|mx)$/.test(f)){if(t.value.trim()===''&&/^(mn|mx)$/.test(f))delete q[f];else{const v=parseFloat(t.value);if(Number.isFinite(v))q[f]=v}}else q[f]=t.value;
   if(isChg){if(f==='a')t.value=q.a;if(pf==='c')row.style.borderLeftColor=hmiCol(q.c);hdDone()}else hdChg();hdItems();return true};
  const edit=e=>{const t=e.target;if(!HD||(t.dataset&&t.dataset.af&&edAl(e))||(t.dataset&&(t.dataset.nf||t.dataset.pf)&&edRow(e)))return;const f=t.dataset&&t.dataset.f;if(!f)return;const c=HD.c,s=hdScr(),d=hdD(),it=hdIt(),isChg=e.type==='change';
   if(!it){
    if(f==='sname'||f==='ht'){if(f==='sname')s.name=t.value||'Screen';else d.hdr.t=t.value;hdItems();hdScrList();if(isChg){t.value=f==='sname'?s.name:d.hdr.t;hdDone()}return}
    if(!isChg)return;
    if(f==='size'){const z=HSZ[t.value];if(z){d.screens.forEach(q=>{q.w=z[0];q.h=z[1]});hdClampAll();hdFit()}}
    else if(f==='bg'){s.bg=HBG[t.value]||s.bg;hdCanvas()}else if(f==='plc'){c.p.plc=t.value;hdProps()}
    else if(f==='grid'){HD.grid=t.checked;hdCanvas()}else if(f==='snap')HD.snap=t.checked;
    else if(f==='hon'){d.hdr.on=t.checked?1:0;hdClampAll();hdProps();hdCanvas()}else if(f==='hsn'){d.hdr.sn=t.checked?1:0;hdItems()}else if(f==='hdt'){d.hdr.dt=t.checked?1:0;hdItems()}else if(f==='hc'){d.hdr.c=t.value;hdItems()}
    else if(f==='ban'){d.ban=t.checked?1:0;hdClampAll();hdCanvas()}
    hdDone();return}
   const num=/^(x|y|w|h|fs|mn|mx|sp)$/.test(f);
   if(num){const v=parseFloat(t.value);if(!Number.isFinite(v))return;it[f]=f==='fs'?Math.max(6,v):f==='mn'||f==='mx'?v:Math.round(v);
    if(/^(x|y|w|h)$/.test(f)){const G=hdG();it.w=Math.max(24,Math.min(s.w,it.w));it.h=Math.max(16,Math.min(G.ch,it.h));hdMove(it,it.x,it.y)}}
   else if(f==='dp')it.dp=t.value===''?null:+t.value;else if(f==='to')it.to=+t.value;
   else if(/^(ll|lw|hw|hh|yn|yx)$/.test(f)){const v=parseFloat(t.value);if(t.value.trim()==='')delete it[f];else if(Number.isFinite(v))it[f]=v;else return}
   else if(t.type==='checkbox')it[f]=t.checked?1:0;else if(f==='ts')it.ts=+t.value;else it[f]=/^a[23]?$/.test(f)?hmiAd(t.value):t.value;
   hdItems();hdSelBox();hdChg();if(isChg){if(/^a[23]?$/.test(f))t.value=it[f];if(f==='nv'||f==='sy')hdProps();hdDone()}};
  hdDlg.addEventListener('input',edit);hdDlg.addEventListener('change',edit);
  hdDlg.addEventListener('keydown',e=>{if(!HD||HD.mode!=='design'||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key,it=hdIt();
   if(k==='Delete'||k==='Backspace'){e.preventDefault();hdDel()}else if((e.ctrlKey||e.metaKey)&&k.toLowerCase()==='d'){e.preventDefault();hdDup()}
   else if(it&&k.startsWith('Arrow')){e.preventDefault();const st=e.shiftKey?HDG:1;hdMove(it,it.x+(k==='ArrowRight'?st:k==='ArrowLeft'?-st:0),it.y+(k==='ArrowDown'?st:k==='ArrowUp'?-st:0));hdItems();hdSelBox();hdSyncPos();hdDone()}
   else if(k==='Escape'&&HD.sel!=null){e.preventDefault();e.stopPropagation();hdSelect(null)}});
  hdDlg.addEventListener('close',()=>{if(HD){if(HD.hold)HD.c.s.hp=0;hmiDesign(HD.c).ed=HD.scr}HD=null;S.dirty=1;props();commit()});
  window.addEventListener('resize',()=>{if(HD&&hdDlg.open)hdFit()})}
 document.getElementById('hdT').textContent='HMI designer – '+c.label;
 hdScrList();hdMode('design');if(!hdDlg.open)hdDlg.showModal();hdFit()}

/* live view (called every frame from app.js): widget values, clock, alarm list, simulation status */
function hmidLive(t){if(!HD||!hdDlg||!hdDlg.open||t-hdLast<70)return;hdLast=t;const c=HD.c,P=hmiPlc(c);
 if(!HD.drag){if(S.run||HD.mode==='sim')hdItems();else if(t-hdClk>1000){hdClk=t;hdItems()}}
 document.getElementById('hdSt').textContent=!S.run?'Simulation stopped':!P?'No PLC in the project':!P.s.pw?'PLC has no power':P.p.mode!=='RUN'?'PLC in STOP mode':'Live · '+P.label+' RUN'}
