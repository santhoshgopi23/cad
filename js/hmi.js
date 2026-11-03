/* ElectroSim v8.20 – busbars (PE / N / L / +24 V / 0 V) and the HMI panel.  Loaded after plc.js.
   BUSBARS  every terminal of a bar is the same electrical node (solver.js joins them through D[type].bus), so one bar replaces a chain of
            terminal blocks: wire every PE to the earth bar, every neutral to the neutral bar, and so on. Terminals are on the top and bottom row.
   HMI      a touch-screen panel designed in the HMI Designer (hmid.js) and linked to a PLC of the project by ADDRESS – no wires.
            The design lives in c.hd = {v:2,nid,sid,aid,ed,hdr,ban,al,screens}
              screens  [{id,name,kind:'n'|'alarm',w,h,bg,items:[{id,k,x,y,w,h,a,l,c,fs,dp,mn,mx,nv,to}]}]  (items in pixels of the CONTENT area, below the header)
              hdr      header bar shown on every screen {on,t,dt,sn,c}: title, date / time, current screen name, accent colour
              ban      1 = alarm banner (newest alarm) at the bottom of every screen except an alarm screen
              al       alarm definitions [{id,a,t,p}]: PLC bit a turns on -> alarm text t of priority p (1 critical red, 2 warning amber, 3 info blue)
              ed       screen last edited in the designer (what the sheet shows while the simulation is stopped)
            Runtime state lives in c.s: sc current screen id, bk back stack, al {open,hist,prev,rid,tab,off} (alarm records: on / ack / off times in ms).
            Widget kinds (HK): btn push button (bit = 1 while held) · sw toggle switch · lamp shows a bit · num numeric display (AI/AO %, T s, C count, or a bit)
            · bar bar graph · txt text · rect panel / frame · nav navigation button (go to screen / back / home). Only btn and sw write to the PLC, and only I and M bits
            (I = same as forcing an input). Ladder logic always runs after the HMI wrote its bits. Alarms are evaluated in the same call (hmiWrite).
   v8.20 (phase 3, js/hmip.js): widget kinds sym (process symbol, item.sy) and trend; every item may carry animation rules item.an and value limits ll / lw / hw / hh.
   To grow it: add a kind in HK + hmiNew() (defaults) + hmiItemSVG() (drawing) + hmiWrite() / hmiRead() (PLC data) + the inspector in hmid.js. */
'use strict';

/* ================= busbars ================= */
const BUSN=[4,6,8,10,12,16],BUSM=16,BUSL={};
const BUSD={
 buspe:{n:'Earth bar (PE)',pre:'XPE',nm:'PE',col:'#d9c61c',tc:'#10202b',d:'Earth (protective earth) busbar'},
 busn:{n:'Neutral bar (N)',pre:'XN',nm:'N',col:'#3b82d6',tc:'#fff',d:'Neutral busbar'},
 busl:{n:'Phase bar (L1 / L2 / L3)',pre:'XL',nm:'L1',col:'#8a5a2b',tc:'#fff',d:'Phase (line) busbar, choose L1, L2 or L3',ph:1},
 bus24:{n:'+24 V DC bar',pre:'X24',nm:'+24 V',col:'#d64545',tc:'#fff',d:'+24 V DC busbar'},
 bus0:{n:'0 V DC bar',pre:'X0',nm:'0 V',col:'#2b4f9e',tc:'#fff',d:'0 V DC busbar'}};
const busCnt=c=>{const v=parseInt(c.p.n,10);return BUSN.includes(v)?v:8};
const busName=(k,c)=>BUSD[k].ph?(c.p.ph||'L1'):BUSD[k].nm;
const busCol=(k,c)=>BUSD[k].ph?({L1:'#8a5a2b',L2:'#2a2a2a',L3:'#8d949b'}[c.p.ph]||'#8a5a2b'):BUSD[k].col;
/* terminals: top row 0..15, bottom row 16..31 (fixed numbers so wires survive a change of size); unused ones are hidden */
function busLay(k,c){const n=busCnt(c),nm=busName(k,c),key=k+n+nm;if(BUSL[key])return BUSL[key];
 const t=[];for(let r=0;r<2;r++)for(let i=0;i<BUSM;i++)t.push(i<n?[(i-(n-1)/2)*20,r?40:-40,nm+' '+(i+1),'o']:[0,0,'','h']);
 return BUSL[key]={t,bb:[-n*10-14,-48,n*20+28,96]}}
function busMake(k){const B=BUSD[k];
 return{n:B.n,ds:B.d+': every terminal is the same point, up to 16 terminals on the top and bottom row. Wire straight to the bar instead of chaining terminal blocks',cat:'Connection',pre:B.pre,
 vs:1,sy:14,bus:1,t:busLay(k,{p:{n:8,ph:'L1'}}).t,bb:busLay(k,{p:{n:8,ph:'L1'}}).bb,
 p:Object.assign({n:[8,'','Number of terminals (per row)',BUSN.map(String)]},B.ph?{ph:['L1','','Phase',['L1','L2','L3']]}:{}),
 dyn:c=>{const L=busLay(k,c);return L.d||(L.d=Object.assign(Object.create(D[k]),{t:L.t,bb:L.bb}))},
 chg:(c,q)=>{if(q!=='n'&&q!=='ph')return false;const m=plcPrune(c);if(m)toast(m+' wire'+(m>1?'s':'')+' on removed terminals deleted');S.dirty=1;if(typeof commit==='function')commit();return true},
 el:()=>[],
 g:c=>{const n=busCnt(c),W=n*20+8,col=busCol(k,c),nm=busName(k,c);let h=`<rect x=${-W/2} y=-14 width=${W} height=28 rx=3 class=s style="fill:${col}" />`;
  if(k==='buspe')for(let x=-W/2+4;x<W/2-4;x+=12)h+=`<rect x=${x} y=-14 width=6 height=28 style="fill:#2f9d3f" />`;
  for(let i=0;i<n;i++){const x=(i-(n-1)/2)*20;h+=`<circle cx=${x} cy=-8 r=2.4 style="fill:#dfe5ea;stroke:#44515c;stroke-width:.8" /><circle cx=${x} cy=8 r=2.4 style="fill:#dfe5ea;stroke:#44515c;stroke-width:.8" />`}
  return h+`<rect x=-17 y=-6 width=34 height=12 rx=2 style="fill:${k==='buspe'?'#fff':'rgba(0,0,0,.35)'};stroke:none" /><text y=3 style="font:700 9px Arial;text-anchor:middle;fill:${k==='buspe'?'#10202b':'#fff'}">${esc(nm)}</text>`}}}
for(const k in BUSD)D[k]=busMake(k);

/* ================= HMI runtime ================= */
let HD=null;                                    /* the open HMI designer (hmid.js), or null */
const HK={btn:'Push button',sw:'Toggle switch',lamp:'Lamp',num:'Numeric display',bar:'Bar graph',txt:'Text',rect:'Panel',nav:'Navigation button',sym:'Process symbol',trend:'Trend chart'};
const HBIT=/^[IQM]\d+\.[0-7]$/,HW=new WeakMap();
const HCOL={Blue:'#2d7dd2',Green:'#2fa05a',Red:'#d64545',Amber:'#e0a020',Grey:'#5b6773',Cyan:'#22b8cf',White:'#e8eef3'};
const HSZ={'4.3" – 480 × 272':[480,272],'7" – 800 × 480':[800,480],'10" – 1024 × 600':[1024,600]};
const HBG={'Navy':'#0f1b26','Black':'#05080b','Graphite':'#1f262e','Deep green':'#0d2018'};
/* alarm priorities: name, colour, text colour on that colour */
const HPRI={1:['Critical','#d64545','#fff'],2:['Warning','#e0a020','#10202b'],3:['Info','#2d7dd2','#fff']};
const HHD=30,HBN=26,HAS=48,HMON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];   /* header, banner, free strip under the alarm list (px) */
const hmiAd=a=>String(a==null?'':a).trim().toUpperCase().replace(/\s+/g,'');
const hmiCol=n=>HCOL[n]||n||HCOL.Blue;
const hmiPri=p=>HPRI[p]||HPRI[2];
const hmiPlcs=()=>S.comps.filter(q=>q.type==='plc');
function hmiPlc(c){const ps=hmiPlcs(),l=String(c.p.plc||'');return ps.find(q=>q.label===l)||ps[0]||null}
const hmiLive=P=>!!(P&&S.run&&P.s.pw&&P.p.mode==='RUN'&&P.s.pl);
const hmiTm=t=>{if(!t)return'--:--:--';const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())};
const hmiDt=t=>{const d=new Date(t);return String(d.getDate()).padStart(2,'0')+' '+HMON[d.getMonth()]+' '+d.getFullYear()};
const hmiClip=(t,n)=>{t=String(t==null?'':t);return t.length>n?t.slice(0,Math.max(1,n-1))+'…':t};
/* default widget of a kind at (x,y) */
function hmiNew(k,x,y,sy){const z={btn:[120,46,'Blue','BUTTON'],sw:[170,46,'Green','SWITCH'],lamp:[150,40,'Green','LAMP'],num:[150,58,'Cyan','VALUE'],bar:[210,46,'Green','LEVEL'],txt:[160,28,'White','Text'],rect:[240,130,'Grey',''],nav:[140,46,'Blue','GO'],sym:[90,90,'Green',''],trend:[320,180,'Cyan','TREND']}[k],
 n={id:0,k,x,y,w:z[0],h:z[1],a:'',l:z[3],c:z[2],fs:k==='txt'?18:14,mn:0,mx:100};if(k==='nav'){n.nv='go';n.to=0}if(k==='sym'||k==='trend')hmipInit(n,sy);return n}
/* the design of an HMI part; an old v8.15 part (widgets in properties t1…) is converted the first time it is needed */
function hmiDesign(c){if(!(c.hd&&c.hd.screens&&c.hd.screens[0])){
 const items=[];let id=1;const add=(k,x,y,a,l,col,w,h)=>{const it=hmiNew(k,x,y);it.id=id++;it.a=a;it.l=l;if(col)it.c=col;if(w){it.w=w;it.h=h}items.push(it)};
 const T=hmiNew('txt',20,14);T.id=id++;T.l='Main screen';T.fs=16;items.push(T);
 const old=c.p.t1!==undefined,L=old?[1,2,3,4,5,6,7,8].map(i=>[c.p['t'+i],c.p['a'+i],c.p['l'+i]]):[['Push button','M0.0','START'],['Push button','M0.1','STOP'],['Toggle switch','M0.2','AUTO'],['Lamp','Q0.0','RUN']];
 let j=0;L.forEach(q=>{const k={'Push button':'btn','Toggle switch':'sw','Lamp':'lamp','Value':'num'}[q[0]];if(!k)return;
  add(k,20+(j%2)*230,56+(j>>1)*70,hmiAd(q[1]),q[2]||'',k==='btn'&&/STOP/i.test(q[2]||'')?'Red':k==='btn'?'Green':null,210,56);j++});
 c.hd={v:1,nid:id,screens:[{id:1,name:'Main',w:480,h:272,bg:HBG.Navy,items}]}}
 return hmiUp(c.hd)}
/* v8.19: designs from v8.18 (one screen) get the header, banner, alarm list and screen kinds; their widgets are squeezed into the content area */
function hmiUp(d){if(d.v>=2)return d;
 d.v=2;d.hdr=Object.assign({on:1,t:'',dt:1,sn:1,c:'Blue'},d.hdr||{});d.ban=d.ban==null?1:d.ban;d.al=Array.isArray(d.al)?d.al:[];d.aid=d.aid||1;
 d.sid=Math.max(0,...d.screens.map(s=>+s.id||0))+1;
 d.screens.forEach(s=>{s.kind=s.kind==='alarm'?'alarm':'n';const G=hmiGeom(d,s);s.items.forEach(it=>{it.h=Math.min(it.h,G.ch);it.y=Math.max(0,Math.min(it.y,G.ch-it.h))})});return d}
/* header / banner heights and the height left for widgets (an alarm screen has no banner) */
function hmiGeom(d,s){const hh=d.hdr&&d.hdr.on?HHD:0,bh=d.ban&&s.kind!=='alarm'?HBN:0;return{hh,bh,ch:s.h-hh-bh}}
/* the screen shown now: designer (design = the one being edited, simulate = the running one), running = current screen, stopped = last edited */
function hmiScr(c){const d=hmiDesign(c);let id;
 if(HD&&HD.c===c)id=HD.mode==='sim'?c.s.sc:HD.scr;else id=S.run?c.s.sc:d.ed;
 return d.screens.find(q=>q.id===id)||(S.run||(HD&&HD.c===c&&HD.mode==='sim')?d.screens[0]:d.screens.find(q=>q.id===d.ed)||d.screens[0])}
const hmiItems=c=>hmiDesign(c).screens.flatMap(s=>s.items);
const hmiAlmScr=c=>hmiDesign(c).screens.find(s=>s.kind==='alarm')||null;
const hmiNp=G=>Math.max(1,Math.floor((G.ch-HAS-46)/24));                       /* alarm rows per page */
function hmiReset(c){c.s.sc=0;c.s.bk=[];c.s.al=null;c.s.hp=0;hmipReset(c)}               /* called by stop() */

/* ---- navigation ---- */
function hmiGo(c,id){const d=hmiDesign(c),cur=hmiScr(c);if(id===cur.id||!d.screens.some(q=>q.id===id))return;
 const b=c.s.bk=c.s.bk||[];b.push(cur.id);if(b.length>20)b.shift();c.s.sc=id;if(c.s.al)c.s.al.off=0}
function hmiNav(c,it){const d=hmiDesign(c);
 if(it.nv==='back'){const b=c.s.bk||[];let id=0;while(b.length&&!d.screens.some(q=>q.id===id))id=b.pop();if(id&&d.screens.some(q=>q.id===id)){c.s.sc=id;if(c.s.al)c.s.al.off=0}}
 else if(it.nv==='home')hmiGo(c,d.screens[0].id);else hmiGo(c,+it.to)}

/* ---- alarms: a PLC bit turning on raises an alarm; ACK; it moves to the history when it is both acknowledged and gone ---- */
function hmiClose(al,r){const i=al.open.indexOf(r);if(i>=0)al.open.splice(i,1);al.hist.unshift(r);if(al.hist.length>200)al.hist.length=200}
function hmiAlarm(h,pl){const d=hmiDesign(h);if(!d.al.length&&!(h.s.al&&h.s.al.open.length))return;
 const al=h.s.al||(h.s.al={rid:0,open:[],hist:[],prev:{},tab:'a',off:0}),now=Date.now();
 d.al.forEach(a=>{const ad=hmiAd(a.a);if(!HBIT.test(ad)&&!/^[TC]\d+$/.test(ad))return;
  const v=pl.b[ad]?1:0,was=al.prev[a.id]||0,act=al.open.find(r=>r.a===a.id&&!r.off);al.prev[a.id]=v;
  if(v&&!was&&!act)al.open.unshift({r:++al.rid,a:a.id,t:a.t||ad,p:a.p||2,ad,on:now,ack:0,off:0});
  else if(!v&&act){act.off=now;if(act.ack)hmiClose(al,act)}})}
function hmiAck(c,rid){const al=c.s.al;if(!al)return;const now=Date.now();
 al.open.slice().forEach(r=>{if(r.ack||(rid&&r.r!==rid))return;r.ack=now;if(r.off)hmiClose(al,r)})}

/* read one address of the linked PLC: {b} bit, {n,u} number, or null when the PLC is stopped / unpowered */
function hmiRead(c,a){const P=hmiPlc(c),k=hmiAd(a);if(!hmiLive(P))return null;const pl=P.s.pl;
 if(/^A[IO]\d+$/.test(k))return{n:(pl.an&&pl.an[k])||0,u:'%'};
 if(/^T\d+$/.test(k))return{n:pl.v[k]||0,u:'s',b:pl.b[k]?1:0};
 if(/^C\d+$/.test(k))return{n:pl.v[k]||0,u:'',b:pl.b[k]?1:0};
 if(HBIT.test(k))return{b:pl.b[k]?1:0};return null}
/* called by plcScan every scan, before the ladder: push button / toggle -> PLC bit, and the alarm bits are watched */
function hmiWrite(P,pl){S.comps.forEach(h=>{if(h.type!=='hmi'||hmiPlc(h)!==P)return;
 let st=HW.get(h);if(!st||st.pl!==pl){st={pl,v:{}};HW.set(h,st)}
 hmiAlarm(h,pl);hmipSample(h,pl);
 hmiItems(h).forEach(it=>{const a=hmiAd(it.a);if((it.k!=='btn'&&it.k!=='sw')||!/^[IM]\d+\.[0-7]$/.test(a))return;
  const v=it.k==='btn'?(h.s.hp===it.id?1:0):(h.s.tg&&h.s.tg[it.id]?1:0);
  if(a[0]==='I')pl.fr[a]=v;                       /* input: same as forcing it (stays until changed) */
  else{const key=it.id+'|'+a;if(st.v[key]!==v){pl.b[a]=v;st.v[key]=v}}})})}   /* M bit: written only when the widget changes, so the ladder can still set / reset it */

/* ---- drawing: one widget in screen pixels. clk = true on the sheet (adds the click hooks used by app.js) ---- */
function hmiItemBase(c,it,clk){const{x,y,w,h}=it,a=hmiAd(it.a),lab=esc(it.l==null?'':it.l),fs=+it.fs||14,col=hmiCol(it.c),
 r=it.k==='lamp'||it.k==='num'||it.k==='bar'?hmiRead(c,a):null,vn=(it.k==='num'||it.k==='bar')&&r&&r.n!=null?r.n:null,vc=vn==null?col:hmipVC(it,vn,col),
 fit=(t,s,m)=>Math.max(7,Math.min(s,(m-12)/(Math.max(1,String(t).length)*.6))),
 T=(px,py,s,st,tx)=>`<text x=${px} y=${py} style="font:600 ${s}px Arial,sans-serif;pointer-events:none;${st}">${tx}</text>`,
 cl=v=>clk?` data-clk="${v}"`:'',cy=y+h/2;let g='';
 if(it.k==='rect')g=`<rect x=${x} y=${y} width=${w} height=${h} rx=8 style="fill:rgba(255,255,255,.04);stroke:#35516a;stroke-width:1.2"/>`+(lab?T(x+10,y+16,11,'fill:#8fb3cf',lab):'');
 else if(it.k==='txt')g=`<rect x=${x} y=${y} width=${w} height=${h} style="fill:transparent"/>`+T(x,y+fs,fs,'fill:'+col,lab);
 else if(it.k==='btn'){const dn=S.run&&c.s.hp===it.id;
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7${cl('p'+it.id)} style="fill:${col};stroke:rgba(0,0,0,.4);stroke-width:1.2;cursor:pointer"/>`+
   `<rect x=${x+2} y=${y+2} width=${w-4} height=${h*.46} rx=5 style="fill:rgba(255,255,255,${dn?0:.17});pointer-events:none"/>`+(dn?`<rect x=${x} y=${y} width=${w} height=${h} rx=7 style="fill:rgba(0,0,0,.3);pointer-events:none"/>`:'')+
   T(x+w/2,cy+fs*.36+(dn?1:0),fit(it.l,fs,w),'fill:#fff;text-anchor:middle',lab)}
 else if(it.k==='nav'){const ix=x+16,I='style="fill:#fff;pointer-events:none"',
   ic=it.nv==='back'?`<polygon points="${ix+8},${cy-9} ${ix-4},${cy} ${ix+8},${cy+9}" ${I}/>`:
      it.nv==='home'?`<polygon points="${ix-8},${cy} ${ix+2},${cy-9} ${ix+12},${cy}" ${I}/><rect x=${ix-5} y=${cy} width=14 height=8 ${I}/>`:
      `<polygon points="${ix-4},${cy-9} ${ix+8},${cy} ${ix-4},${cy+9}" ${I}/>`;
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7${cl('n'+it.id)} style="fill:${col};stroke:rgba(0,0,0,.4);stroke-width:1.2;cursor:pointer"/>`+
   `<rect x=${x+2} y=${y+2} width=${w-4} height=${h*.46} rx=5 style="fill:rgba(255,255,255,.17);pointer-events:none"/>`+ic+
   T(x+w/2+12,cy+fs*.36,fit(it.l,fs,w-30),'fill:#fff;text-anchor:middle',lab)}
 else if(it.k==='sw'){const on=!!(c.s.tg&&c.s.tg[it.id]);
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7${cl('t'+it.id)} style="fill:#1b2a38;stroke:#35516a;stroke-width:1.2;cursor:pointer"/>`+T(x+12,cy+fs*.36,fit(it.l,fs,w-50),'fill:#cfe3f1',lab)+
   `<rect x=${x+w-52} y=${cy-12} width=40 height=24 rx=12 style="fill:${on?col:'#56606a'};pointer-events:none"/><circle cx=${on?x+w-24:x+w-40} cy=${cy} r=9 style="fill:#fff;pointer-events:none"/>`}
 else if(it.k==='lamp'){const on=!!(r&&(r.b!=null?r.b:r.n>0)),R=Math.max(6,Math.min(h/2-6,14));
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7 style="fill:#1b2a38;stroke:#35516a;stroke-width:1.2"/>`+(on?`<circle cx=${x+R+10} cy=${cy} r=${R+5} style="fill:${col};opacity:.28"/>`:'')+
   `<circle cx=${x+R+10} cy=${cy} r=${R} style="fill:${on?col:'#2a3a33'};stroke:rgba(255,255,255,.35);stroke-width:1"/>`+T(x+R*2+20,cy+fs*.36,fit(it.l,fs,w-R*2-16),'fill:#cfe3f1',lab)}
 else if(it.k==='num'){const dp=it.dp===''||it.dp==null?(r&&r.u==='s'?1:0):+it.dp,
  s=r==null?'--':r.u==='%'?r.n.toFixed(dp)+' %':r.u==='s'?r.n.toFixed(dp)+' s':r.n!=null?r.n.toFixed(dp):(r.b?'ON':'OFF'),vs=Math.min(h*.5,30);
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7 style="fill:#0a131b;stroke:#35516a;stroke-width:1.2"/>`+T(x+10,y+15,10,'fill:#8fb3cf',lab)+T(x+w-10,y+h-9,vs,'fill:'+vc+';text-anchor:end;font-family:ui-monospace,Consolas,monospace',s)}
 else if(it.k==='bar'){const mn=+it.mn||0,mx=+it.mx,sp=(Number.isFinite(mx)&&mx!==mn?mx:mn+100)-mn,v=r==null?mn:r.b!=null&&r.u==null?(r.b?mn+sp:mn):r.n,p=Math.max(0,Math.min(1,(v-mn)/sp));
  g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7 style="fill:#1b2a38;stroke:#35516a;stroke-width:1.2"/>`+T(x+10,y+16,11,'fill:#8fb3cf',lab)+T(x+w-10,y+16,11,'fill:#cfe3f1;text-anchor:end',r==null?'--':Math.round(v)+(r.u==='%'?' %':''))+
   `<rect x=${x+10} y=${y+h-20} width=${w-20} height=10 rx=5 style="fill:#0a131b"/><rect x=${x+10} y=${y+h-20} width=${Math.max(0,(w-20)*p)} height=10 rx=5 style="fill:${vc}"/>`+hmipMarks(it,mn,mn+sp).map(m=>`<rect x=${x+10+(w-20)*m[0]-1} y=${y+h-23} width=2 height=16 style="fill:${m[1]}"/>`).join('')}
 return g}
/* one widget: process symbols and trends are drawn by hmip.js; the animation rules (colour, blink, visibility, fill, rotation, movement) wrap any widget */
function hmiItemSVG(c,it,clk){const A=hmipAnim(c,it);if(A.hide)return'';const q=A.col?Object.assign({},it,{c:A.col}):it;
 let g=q.k==='sym'?hmipSym(c,q,clk):q.k==='trend'?hmipTrend(c,q,clk):hmiItemBase(c,q,clk);g+=A.fill;
 const tf=(A.dx||A.dy?`translate(${A.dx.toFixed(1)} ${A.dy.toFixed(1)}) `:'')+(A.rot?`rotate(${A.rot.toFixed(1)} ${it.x+it.w/2} ${it.y+it.h/2})`:'');
 return`<g data-hi=${it.id}${tf?` transform="${tf}"`:''}${A.op<1?` opacity=${A.op}`:''}>${g}</g>`}

/* ---- the header bar (every screen) ---- */
const hmiT=(px,py,s,st,tx)=>`<text x=${px} y=${py} style="font:600 ${s}px Arial,sans-serif;pointer-events:none;${st}">${tx}</text>`;
function hmiHdrSVG(c,s,d){const h=d.hdr;if(!h.on)return'';const W=s.w,n=Date.now(),m=Math.floor(W*.3/8);
 return`<g data-hdr=1><rect x=0 y=0 width=${W} height=${HHD} style="fill:#13293d"/><rect x=0 y=${HHD-2} width=${W} height=2 style="fill:${hmiCol(h.c)}"/>`+
  hmiT(10,20,14,'fill:#fff',esc(hmiClip(h.t||c.label,m)))+(h.sn?hmiT(W/2,20,13,'fill:#8fd0ff;text-anchor:middle',esc(hmiClip(s.name,m))):'')+
  (h.dt?hmiT(W-10,19,11,'fill:#cfe3f1;text-anchor:end;font-family:ui-monospace,Consolas,monospace',hmiDt(n)+'  '+hmiTm(n)):'')+'</g>'}

/* ---- the alarm banner (every screen except an alarm screen): newest alarm, flashes until acknowledged; tap = open the alarm screen ---- */
function hmiBanSVG(c,s,d,G,clk,demo){if(!G.bh)return'';const W=s.w,y=s.h-G.bh,al=c.s.al||{open:[]},cl=v=>clk?` data-clk="${v}"`:'';let r=demo?null:al.open[0];
 if(demo&&d.al[0]){const a=d.al[0];r={r:0,t:a.t||a.a||'Alarm',p:a.p,on:Date.now(),ack:1,off:0}}
 if(!r)return`<g data-ban=1><rect x=0 y=${y} width=${W} height=${G.bh} style="fill:#0b141c"/><circle cx=14 cy=${y+G.bh/2} r=4 style="fill:#2fa05a"/>`+hmiT(26,y+17,11,'fill:#8da3b4',demo?'Alarm banner – the newest alarm appears here':'No active alarms')+'</g>';
 const P=hmiPri(r.p),fl=!demo&&!r.ack&&Math.floor(Date.now()/500)%2,n=al.open.length,tc=P[2],mid=y+G.bh/2,
  txt=hmiTm(r.on)+'  '+hmiClip(r.t,Math.floor((W-(r.ack?110:170))/6.6))+(r.off&&!demo?'  (cleared)':'');
 return`<g data-ban=1${cl('bn')} style="cursor:pointer"><rect x=0 y=${y} width=${W} height=${G.bh} style="fill:${P[1]};opacity:${fl?.55:1}"/>`+
  `<polygon points="9,${mid+8} 16,${mid-8} 23,${mid+8}" style="fill:${tc};pointer-events:none"/><rect x=15.2 y=${mid-3} width=1.6 height=6 style="fill:${P[1]};pointer-events:none"/>`+
  hmiT(32,y+17,12,'fill:'+tc,esc(txt))+(n>1?hmiT(W-(r.ack||demo?10:70),y+17,10,'fill:'+tc+';text-anchor:end','+'+(n-1)+' more'):'')+
  (!r.ack&&!demo?`<g${cl('k'+r.r)}><rect x=${W-60} y=${y+3} width=52 height=${G.bh-6} rx=4 style="fill:rgba(0,0,0,.3);stroke:${tc};stroke-width:1"/>`+hmiT(W-34,y+17,11,'fill:'+tc+';text-anchor:middle','ACK')+'</g>':'')+'</g>'}

/* ---- the alarm list (an alarm screen): ACTIVE / HISTORY tabs, ACK, ACK ALL, page buttons ---- */
function hmiDemoRows(d,np){const n=Date.now(),L=d.al.slice(0,np).map((a,i)=>({r:0,t:a.t||a.a||'Alarm',p:a.p,on:n-(i+1)*95000,ack:i%2?n-i*40000:0,off:0}));
 return L.length?L:[{r:0,t:'Sample: motor overload',p:1,on:n-190000,ack:0,off:0},{r:0,t:'Sample: tank level low',p:2,on:n-95000,ack:n-30000,off:0},{r:0,t:'Sample: door open',p:3,on:n-20000,ack:0,off:0}]}
function hmiAlarmSVG(c,s,G,d,clk,demo){const W=s.w,al=c.s.al||{open:[],hist:[],tab:'a',off:0},tab=!demo&&al.tab==='h'?'h':'a',cl=v=>clk?` data-clk="${v}"`:'',M='font-family:ui-monospace,Consolas,monospace;',
 top=46,rh=24,np=hmiNp(G),rows=demo?hmiDemoRows(d,np):tab==='h'?al.hist:al.open,N=rows.length,off=Math.max(0,Math.min(al.off||0,Math.max(0,N-np))),vis=rows.slice(off,off+np),ph=Math.floor(Date.now()/500)%2,
 btn=(x,w,lab,on,act,col)=>`<g${cl(act)} style="cursor:pointer"><rect x=${x} y=2 width=${w} height=24 rx=5 style="fill:${on?(col||'#2d7dd2'):'#1b2a38'};stroke:#35516a;stroke-width:1"/>`+hmiT(x+w/2,18,11,'fill:#fff;text-anchor:middle',lab)+'</g>',
 pg=(x,up,act)=>`<g${cl(act)} style="cursor:pointer"><rect x=${x} y=2 width=30 height=24 rx=5 style="fill:#1b2a38;stroke:#35516a;stroke-width:1"/><polygon points="${up?`${x+9},18 ${x+15},9 ${x+21},18`:`${x+9},10 ${x+15},19 ${x+21},10`}" style="fill:#cfe3f1;pointer-events:none"/></g>`;
 let g=btn(6,112,'ACTIVE ('+al.open.length+')',tab==='a','ta')+btn(122,96,'HISTORY',tab==='h','th')+(tab==='a'?btn(W-98,92,'ACK ALL',1,'ka','#1d6b44'):'')+pg(W-132,0,'pd')+pg(W-166,1,'pu')+
  `<rect x=6 y=44 width=${W-12} height=1 style="fill:#35516a"/>`;
 const H=(x,t,st)=>hmiT(x,40,10,'fill:#8fb3cf;'+(st||''),t);
 g+=tab==='a'?H(16,'ON TIME')+H(80,'ALARM')+H(W-146,'STATE'):H(16,'ON')+H(80,'ACK')+H(144,'OFF')+H(208,'ALARM');
 g+=H(W-8,N?(off+1)+'–'+Math.min(N,off+np)+' / '+N:'0',';text-anchor:end');
 vis.forEach((r,i)=>{const y=top+i*rh,P=hmiPri(r.p),act=!r.off,un=!r.ack,my=y+16;
  g+=`<rect x=6 y=${y} width=${W-12} height=${rh-2} rx=3 style="fill:rgba(255,255,255,.05)"/>`+(un&&(tab==='a'||demo)?`<rect x=6 y=${y} width=${W-12} height=${rh-2} rx=3 style="fill:${P[1]};opacity:${demo?.16:ph?.34:.14}"/>`:'')+
   `<rect x=6 y=${y} width=5 height=${rh-2} style="fill:${P[1]}"/>`;
  if(tab==='a'){
   g+=hmiT(16,my,11,M+'fill:#cfe3f1',hmiTm(r.on))+hmiT(80,my,12,'fill:#fff',esc(hmiClip(r.t,Math.floor((W-80-150)/6.6))))+
    hmiT(W-146,my,10,'fill:'+(un?P[1]:'#8fd0b0'),act?(un?'ACTIVE':'ACKED'):'CLEARED')+
    (un?`<g${cl('k'+r.r)} style="cursor:pointer"><rect x=${W-66} y=${y+2} width=54 height=${rh-6} rx=4 style="fill:${P[1]};stroke:rgba(255,255,255,.45);stroke-width:1"/>`+hmiT(W-39,y+15,10,'fill:'+P[2]+';text-anchor:middle','ACK')+'</g>':
     hmiT(W-66,my,10,M+'fill:#8da3b4',hmiTm(r.ack)))}
  else g+=hmiT(16,my,11,M+'fill:#cfe3f1',hmiTm(r.on))+hmiT(80,my,11,M+'fill:#cfe3f1',hmiTm(r.ack))+hmiT(144,my,11,M+'fill:#cfe3f1',hmiTm(r.off))+hmiT(208,my,12,'fill:#fff',esc(hmiClip(r.t,Math.floor((W-208-10)/6.6))))});
 if(!N)g+=hmiT(W/2,top+34,13,'fill:#6f8ba3;text-anchor:middle',tab==='a'?'No active alarms':'History is empty');
 return g}

/* a whole screen: widgets (and the alarm list) under the header, then header and banner on top */
function hmiScreenSVG(c,clk,s){const d=hmiDesign(c);s=s||hmiScr(c);const G=hmiGeom(d,s),demo=!!(HD&&HD.c===c&&HD.mode==='design');
 return`<g transform="translate(0,${G.hh})">`+(s.kind==='alarm'?hmiAlarmSVG(c,s,G,d,clk,demo):'')+s.items.map(it=>hmiItemSVG(c,it,clk)).join('')+'</g>'+hmiHdrSVG(c,s,d)+hmiBanSVG(c,s,d,G,clk,demo)}

D.hmi={n:'HMI panel (touch screen, linked to a PLC)',ds:'Touch-screen HMI designed in its own HMI Designer (double-click): several screens with navigation buttons, a header bar, an alarm list with history and a banner, plus buttons, switches, lamps, numeric displays and bar graphs linked to a PLC of the project by address. No wiring needed',cat:'Automation',pre:'HMI',norot:1,t:[],
 bb:c=>{const s=hmiScr(c),H=260*s.h/s.w;return[-136,-H/2-12,272,H+34]},
 p:{plc:['Auto (first PLC)','','Linked PLC',()=>['Auto (first PLC)',...hmiPlcs().map(q=>q.label)]]},
 el:()=>[],
 dn:(c,a)=>{if(S.run&&/^p\d+$/.test(a||''))c.s.hp=+a.slice(1)},
 /* tap on a widget / the banner / the alarm list. f = 1 when called from the designer's Simulate mode (navigation and tabs then work without ▶ Run) */
 clk:(c,a,f)=>{a=a||'';const ok=S.run||f;let m;
  if(/^t\d+$/.test(a)){if(!S.run){if(f)toast('Press ▶ Run first');return}const i=+a.slice(1);c.s.tg=c.s.tg||{};c.s.tg[i]=!c.s.tg[i]}
  else if(/^n\d+$/.test(a)){if(!ok)return;const it=hmiItems(c).find(q=>q.id===+a.slice(1));if(it)hmiNav(c,it)}
  else if(a==='bn'){if(!ok)return;const q=hmiAlmScr(c);if(q)hmiGo(c,q.id);else if(c.s.al&&c.s.al.open[0])hmiAck(c,c.s.al.open[0].r)}
  else if(/^q[pmnlr]\d+$/.test(a)){if(!ok)return;hmipTrClk(c,a)}
  else if(/^k(\d+|a)$/.test(a)){if(!S.run)return;hmiAck(c,a==='ka'?0:+a.slice(1))}
  else if(a==='ta'||a==='th'){if(!ok)return;const al=c.s.al=c.s.al||{rid:0,open:[],hist:[],prev:{},tab:'a',off:0};al.tab=a==='th'?'h':'a';al.off=0}
  else if(a==='pu'||a==='pd'){if(!ok)return;const al=c.s.al=c.s.al||{rid:0,open:[],hist:[],prev:{},tab:'a',off:0},s=hmiScr(c),np=hmiNp(hmiGeom(hmiDesign(c),s)),N=(al.tab==='h'?al.hist:al.open).length;
   al.off=Math.max(0,Math.min((al.off||0)+(a==='pd'?np:-np),Math.max(0,N-np)))}
  S.dirty=1},
 st:c=>{const P=hmiPlc(c);if(!P)return'';const n=c.s.al?c.s.al.open.length:0;return hmiLive(P)?'Linked to '+P.label+' (RUN)'+(n?' · '+n+' alarm'+(n>1?'s':''):''):'Linked to '+P.label+(S.run?' – PLC stopped or no power':'')},
 msg:c=>{const r=[],P=hmiPlc(c),d=hmiDesign(c);if(!P){r.push(['wa',`${c.label}: no PLC in the project – place a PLC part, the HMI connects to it by address (no wires)`]);return r}
  const A=plAdrs(P),all=new Set([].concat(A.I,A.Q,A.M,A.T,A.C,A.AI,A.AO)),bits=new Set([].concat(A.I,A.Q,A.M,A.T,A.C));
  d.screens.forEach(s=>s.items.forEach(it=>{if(!/^(btn|sw|lamp|num|bar|nav)$/.test(it.k))return;const a=hmiAd(it.a),n=`${c.label} / ${s.name}: “${it.l||HK[it.k]}”`;
   if(it.k==='nav'){if(it.nv==='go'&&!d.screens.some(q=>q.id===+it.to))r.push(['wa',`${n} has no target screen – choose one in its properties`]);return}
   if(!a)r.push(['wa',`${n} has no PLC address`]);
   else if(!all.has(a))r.push(['wa',`${n}: address ${a} does not exist in ${P.label} (check its I/O count)`]);
   else if((it.k==='btn'||it.k==='sw')&&!/^[IM]/.test(a))r.push(['wa',`${n}: the HMI can write only I and M bits, not ${a} – use an M bit and drive ${a} from the ladder`])}));
  hmipMsg(c,P,d,all,r);
  d.al.forEach(a=>{const ad=hmiAd(a.a),n=`${c.label} alarm “${a.t||ad||'new alarm'}”`;
   if(!ad)r.push(['wa',`${n} has no PLC address`]);else if(!bits.has(ad))r.push(['wa',`${n}: ${ad} is not a bit of ${P.label} (use an I, Q, M bit, a timer or a counter)`])});
  if(d.al.length&&!d.screens.some(q=>q.kind==='alarm'))r.push(['wa',`${c.label}: alarms are defined but there is no alarm screen – add one with “＋ Alarms” so they can be acknowledged`]);
  return r},
 pp:c=>{const P=hmiPlc(c),live=hmiLive(P),d=hmiDesign(c),n=hmiItems(c).length,ns=d.screens.length,al=c.s.al,sc=hmiScr(c);
  return`<p><button class=pri data-a=hmi>✎ Open HMI designer</button></p><div class=sec>Connection</div><p style="margin:2px 0">${P?`Linked to <b>${esc(P.label)}</b> – ${live?'<b style="color:var(--ok)">RUN</b>':S.run?'PLC stopped or without power':'press ▶ Run'}.`:'<b>No PLC found.</b> Place a PLC part on any page.'}</p>
   <p class=mu>${ns} screen${ns===1?'':'s'} (showing “${esc(sc.name)}”), ${n} widget${n===1?'':'s'}, ${d.al.length} alarm${d.al.length===1?'':'s'}${al&&al.open.length?` – <b>${al.open.length} active</b>`:''}; ${sc.w} × ${sc.h} px. Double-click the panel on the sheet (or use the button above) to design it. No wires: the HMI talks to the PLC by address – a push button or toggle writes an <b>M bit</b> (use a contact of the same address in the ladder), lamps and displays read Q / M / I bits, AI / AO, timers and counters, and an alarm is raised when its bit turns on.</p>`},
 g:c=>{const s=hmiScr(c),P=hmiPlc(c),live=hmiLive(P),k=260/s.w,H=s.h*k,y0=-H/2;
  return`<rect x=-136 y=${y0-12} width=272 height=${H+34} rx=10 class=s style="fill:#2b3138" /><rect x=-130 y=${y0-6} width=260 height=${H} rx=2 style="fill:${s.bg}" /><g transform="translate(-130,${y0-6}) scale(${k})">${hmiScreenSVG(c,true,s)}</g>`+
   `<text x=-128 y=${y0+H+10} style="font:600 8px Arial;fill:#8da3b4;pointer-events:none">HMI</text><text x=128 y=${y0+H+10} style="font:600 8px Arial;text-anchor:end;pointer-events:none;fill:${live?'#41e07a':'#8da3b4'}">${P?esc(P.label)+(live?' · RUN':' · offline'):'no PLC'}</text>`}};
