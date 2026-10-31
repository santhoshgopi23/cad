/* ElectroSim – component registry
   Add a new part to the `D` object:
   n=name  cat=library category  pre=label prefix  t=terminals [x,y,name,flags]  (flags: o=optional, h=hidden internal node)
   p=params {key:[default,unit,label,options]}  (unit 'txt' = text field)  cl=closed?  el=circuit elements  g=symbol
   Terminal coordinates must be multiples of 20 so wires land on the 15-unit sheet grid (symbols are drawn at SC scale).
   Optional: lp [x,y,'start'|'end'] (label position) vs (all stubs vertical) src (supply) gi (ground terminal) np (poles checked for trip) agg (3-phase totals) cv (coil-voltage logic)
             xr (can be referenced by contacts) ns (symbol only) bom:0 (not in parts list) us (unscaled) bg (draw behind) */
'use strict';
const DT=.02,SC=.75,GRID=15,SQ3=Math.sqrt(3);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f=x=>{if(x==null||isNaN(x))return'–';const a=Math.abs(x);if(a<1e-9)return'0';if(a>=1e3)return(x/1e3).toFixed(2)+'k';if(a<1)return(x*1e3).toFixed(1)+'m';return x.toFixed(2)};
const R=(c,r)=>({k:'R',a:0,b:1,r}),RR=(a,b,r)=>({k:'R',a,b,r});
const gl=(c,o)=>o?Math.min(1.3,o.p/c.p.P):0;
let LM={};   /* label -> coil/relay component, rebuilt by lmap() */
const refOn=c=>{const o=LM[String(c.p.ref||'').trim().toUpperCase()];if(!o)return 0;const t=o.type;return t==='tcoil'||t==='ton'?!!o.s.done:t==='tcoff'?!!o.s.hold:!!o.s.en};
const SW=c=>[R(c,D[c.type].cl(c)?.005:1e9)];
const two=[[-40,0,'1'],[40,0,'2']],vert=[[0,-40,'1'],[0,40,'2']];
const T3=[[-20,-40,'1'],[0,-40,'3'],[20,-40,'5'],[-20,40,'2'],[0,40,'4'],[20,40,'6']];
const T2P=[[-20,-40,'1'],[20,-40,'3'],[-20,40,'2'],[20,40,'4']];
const el3=c=>[0,1,2].map(i=>RR(i,i+3,D[c.type].cl(c)?.005:1e9));
const el2p=c=>[0,1].map(i=>RR(i,i+2,D[c.type].cl(c)?.005:1e9));
const brk=c=>c.s.on&&!c.s.tripped;
const DASH='style="stroke-dasharray:3 3"';
/* three-pole symbol: k = cb (breaker) | sw (isolator) | ct (contactor) */
const P3=(c,cl,k,txt)=>{const er=c.s.tripped?' er':'';let h='';
 for(const x of[-20,0,20]){const ex=cl?x:x-9,ey=cl?-22:-10;
  h+=`<path d="M${x} 22L${ex} ${ey}" class="s${er}" /><circle cx=${x} cy=-22 r=2 class=f />`;
  if(k=='cb')h+=`<path d="M${ex-4} ${ey-4}l8 8M${ex+4} ${ey-4}l-8 8" class=s />`;
  if(k=='sw')h+=`<path d="M${ex-5} ${ey}h10" class=s />`;
  if(k=='ct')h+=`<path d="M${x-5} 8a5 5 0 0 1 10 0" class=s />`}
 return h+`<path d="M-20 -2H20" class=s ${DASH} /><text x=32 y=4 class=mt style="text-anchor:start">${esc(txt)}</text>`};
const OV3=c=>{const tr=c.s.tripped,er=tr?' er':'';let h='';
 for(const x of[-20,0,20])h+=`<path d="M${x} -22V-12L${x-5} -7L${x+5} 2L${x-5} 11L${x} 16V22" class="s${er}" />`;
 return h+`<path d="M20 0H40" class=s ${DASH} /><path d="M40 20L${tr?52:40} ${tr?-12:-20}" class="s${er}" /><text x=-26 y=-44 class=mt style="text-anchor:end">${c.p.I}A</text>`};
const MOT_LEADS='<path d="M-20 -22V-16.6M0 -22V-26M20 -22V-16.6M22 0H26" class=s />';
/* block symbol for drives (symbol only) */
const DRV=(a,b)=>c=>`<rect x=-34 y=-40 width=68 height=80 rx=2 class=s /><text y=-6 class=tx>${a}</text><text y=12 class=mt>${b}</text>`+
 ['L1','L2','L3'].map((n,i)=>`<text x=${-20+i*20} y=-31 class=mt style="font-size:8px">${n}</text>`).join('')+
 ['U','V','W'].map((n,i)=>`<text x=${-20+i*20} y=36 class=mt style="font-size:8px">${n}</text>`).join('')+`<text x=-30 y=3 class=mt style="text-anchor:start;font-size:8px">PE</text>`;
const TDRV=[[-20,-60,'L1'],[0,-60,'L2'],[20,-60,'L3'],[-20,60,'U'],[0,60,'V'],[20,60,'W'],[-40,0,'PE','o']];

const D={
/* ---------- Power ---------- */
dc:{n:'DC Supply',cat:'Power',pre:'V',src:1,t:[[0,-40,'+'],[0,40,'−']],p:{V:[24,'V','Voltage'],Imax:[50,'A','Max current']},el:c=>[{k:'V',a:0,b:1,v:c.p.V}],g:()=>`<circle r=20 class=s /><text y=5 class=tx>DC</text><text x=-26 y=-16 class=mt>+</text>`},
ac:{n:'AC Supply 1-ph (RMS)',cat:'Power',pre:'V',src:1,t:[[0,-40,'L'],[0,40,'N']],p:{V:[230,'V','RMS voltage'],Imax:[50,'A','Max current']},el:c=>[{k:'V',a:0,b:1,v:c.p.V}],g:()=>`<circle r=20 class=s /><path d="M-9 0q4.5-9 9 0t9 0" class=s />`},
ac3:{n:'AC Supply 3-ph (L1 L2 L3 N PE)',cat:'Power',pre:'V',src:1,gi:3,agg:1,vs:1,lp:[-42,-12,'end'],bb:[-44,-38,128,86],t:[[-20,40,'L1'],[0,40,'L2'],[20,40,'L3'],[40,40,'N','o'],[60,40,'PE','o']],p:{V:[400,'V','Line voltage (L-L)'],Imax:[100,'A','Max current']},
 /* L1 L2 L3 sit on the same -20 / 0 / +20 columns as 3-pole breakers, contactors and motors, so the wires drop straight down */
 el:c=>{const v=c.p.V/SQ3;return[{k:'V',a:0,b:3,v,ang:0},{k:'V',a:1,b:3,v,ang:-120},{k:'V',a:2,b:3,v,ang:120}]},
 g:c=>`<rect x=-36 y=-34 width=112 height=56 rx=3 class=s /><text x=20 y=-14 class=tx>3~ ${c.p.V} V</text><text x=20 y=1 class=mt>50 Hz</text>`+
  ['L1','L2','L3','N','PE'].map((n,i)=>`<text x=${-20+i*20} y=16 class=mt style="font-size:9px;font-weight:700">${n}</text>`).join('')+
  `<path d="M-32 6H72" class=s style="stroke-width:1;opacity:.35" />`},
psu:{n:'Power Supply (AC/DC)',cat:'Power',pre:'G',cv:1,t:[[-40,-20,'L'],[-40,20,'N'],[40,-20,'+'],[40,20,'−']],p:{Vin:[230,'V','Input voltage'],Vo:[24,'V','Output voltage'],P:[120,'W','Rated output power']},
 el:c=>[RR(0,1,c.p.Vin*c.p.Vin/(c.p.P/.9)),{k:'V',a:2,b:3,v:c.s.en?c.p.Vo:0}],
 g:c=>`<rect x=-22 y=-30 width=44 height=60 class="s ${c.s.en?'on':''}" /><path d="M-22 30L22 -30" class=s /><text x=-10 y=-12 class=tx>~</text><text x=10 y=24 class=tx>=</text>`},
pe:{n:'Earth / PE',cat:'Power',pre:'PE',nolbl:1,bom:0,t:[[0,-40,'PE']],p:{},el:()=>[],g:()=>`<path d="M0 -22V-6M-14 -6H14M-9 0H9M-4 6H4" class=s />`},

/* ---------- Protection ---------- */
mcb:{n:'MCB (1-pole)',cat:'Protection',pre:'Q',t:two,p:{I:[16,'A','Trip current']},cl:brk,el:SW,g:(c,o,cl)=>`<rect x=-20 y=-14 width=40 height=28 class="s ${c.s.tripped?'er':''}" /><path d="M-10 7L${cl?10:4} ${cl?7:-8}" class=s /><text y=-18 class=mt>MCB ${c.p.I}A</text>`},
mccb:{n:'MCCB (1-pole)',cat:'Protection',pre:'Q',t:two,p:{I:[100,'A','Trip current']},cl:brk,el:SW,g:(c,o,cl)=>`<rect x=-20 y=-16 width=40 height=32 class="s ${c.s.tripped?'er':''}" /><path d="M-10 8L${cl?10:4} ${cl?8:-10}" class=s /><text y=-20 class=mt>MCCB ${c.p.I}A</text>`},
mcb3:{n:'MCB (3-pole)',cat:'Protection',pre:'Q',np:3,t:T3,p:{I:[16,'A','Trip current']},cl:brk,el:el3,g:(c,o,cl)=>P3(c,cl,'cb',`${c.p.I}A`)},
mccb3:{n:'MCCB (3-pole)',cat:'Protection',pre:'Q',np:3,t:T3,p:{I:[100,'A','Trip current']},cl:brk,el:el3,g:(c,o,cl)=>P3(c,cl,'cb',`${c.p.I}A`)},
mpcb3:{n:'Motor Protection Breaker (3P)',cat:'Protection',pre:'Q',np:3,t:T3,p:{I:[6,'A','Trip current']},cl:brk,el:el3,g:(c,o,cl)=>P3(c,cl,'cb',`MPCB ${c.p.I}A`)},
rcd:{n:'RCCB / RCD (2-pole)',cat:'Protection',pre:'Q',np:2,t:T2P,p:{I:[25,'A','Rated current'],mA:[30,'mA','Sensitivity (info)']},cl:brk,el:el2p,
 g:(c,o,cl)=>{const er=c.s.tripped?' er':'';let h='';for(const x of[-20,20]){const ex=cl?x:x-9,ey=cl?-22:-10;h+=`<path d="M${x} 22L${ex} ${ey}" class="s${er}" /><circle cx=${x} cy=-22 r=2 class=f /><path d="M${ex-4} ${ey-4}l8 8M${ex+4} ${ey-4}l-8 8" class=s />`}
  return h+`<circle cy=8 r=6 class=s /><path d="M-20 -2H20" class=s ${DASH} /><text x=32 y=4 class=mt style="text-anchor:start">${c.p.I}A/${c.p.mA}mA</text>`}},
fus:{n:'Fuse',cat:'Protection',pre:'F',t:two,p:{I:[2,'A','Rating']},cl:c=>!c.s.blown,el:SW,g:c=>`<rect x=-20 y=-6 width=40 height=12 class="s ${c.s.blown?'er':''}" /><path d="${c.s.blown?'M-20 0H-6M6 0H20':'M-20 0H20'}" class=s />`},
iso:{n:'Isolator Switch (1-pole)',cat:'Protection',pre:'Q',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>`<circle cx=-20 r=2.5 class=f /><circle cx=20 r=2.5 class=f /><path d="M-20 0L${cl?20:14} ${cl?0:-14}" class=s /><rect x=-20 y=-14 width=40 height=28 class=s ${DASH} />`},
iso3:{n:'Isolator Switch (3-pole)',cat:'Protection',pre:'Q',t:T3,p:{},cl:c=>c.s.on,el:el3,g:(c,o,cl)=>P3(c,cl,'sw','')},
ovl:{n:'Overload Relay (1-pole)',cat:'Protection',pre:'F',t:[[-40,-20,'1'],[40,-20,'2'],[-40,20,'95'],[40,20,'96']],p:{I:[6,'A','Trip setting']},el:c=>[R(c,.01),RR(2,3,c.s.tripped?1e9:.005)],g:c=>`<rect x=-20 y=-26 width=40 height=52 class="s ${c.s.tripped?'er':''}" /><path d="M-14-15q4-6 8 0t8 0t8 0" class=s /><text y=18 class=tx>F</text>`},
ovl3:{n:'Thermal Overload Relay (3P)',cat:'Protection',pre:'F',np:3,sx:40,t:[...T3,[60,-20,'95','o'],[60,20,'96','o']],p:{I:[6,'A','Trip setting']},el:c=>[RR(0,3,.01),RR(1,4,.01),RR(2,5,.01),RR(6,7,c.s.tripped?1e9:.005)],g:OV3},
spd:{n:'Surge Protector (SPD)',cat:'Protection',pre:'F',t:[[0,-40,'L'],[0,40,'PE']],p:{},el:c=>[R(c,1e9)],g:()=>`<rect x=-10 y=-22 width=20 height=44 class=s /><path d="M0 -14V12M-5 6L0 13L5 6" class=s />`},

/* ---------- Switching & operator devices ---------- */
sw:{n:'Switch',cat:'Switching',pre:'S',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>`<circle cx=-20 r=2.5 class=f /><circle cx=20 r=2.5 class=f /><path d="M-20 0L${cl?20:14} ${cl?0:-14}" class=s />`},
pb:{n:'Push Button (NO)',cat:'Switching',pre:'PB',t:two,p:{},cl:c=>c.s.pressed,el:SW,g:(c,o,cl)=>{const y=cl?-5:-20;return`<circle cx=-20 r=2.5 class=f /><circle cx=20 r=2.5 class=f /><path d="M-20 0L${cl?20:14} ${cl?0:-10}M-8 ${y}h16M0 ${y}V-8" class=s />`}},
sel3:{n:'Selector Switch 3-pos (H-0-A)',cat:'Switching',pre:'S',t:[[-40,0,'COM'],[40,-20,'HAND'],[40,20,'AUTO']],p:{pos:['OFF','','Position',['HAND','OFF','AUTO']]},
 el:c=>[RR(0,1,c.p.pos==='HAND'?.005:1e9),RR(0,2,c.p.pos==='AUTO'?.005:1e9)],
 g:c=>{const y=c.p.pos==='HAND'?-20:c.p.pos==='AUTO'?20:0,x=c.p.pos==='OFF'?10:22;return`<circle cx=-22 r=2.5 class=f /><circle cx=22 cy=-20 r=2.5 class=f /><circle cx=22 cy=20 r=2.5 class=f /><path d="M-22 0L${x} ${y}" class=s /><path d="M-4 0V-16" class=s ${DASH} /><circle cx=-4 cy=-20 r=4 class=s /><text x=10 y=-24 class=mt>H</text><text x=10 y=32 class=mt>A</text>`}},
ths:{n:'Thermostat (temp. switch)',cat:'Switching',pre:'BT',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>D.sw.g(c,o,cl)+`<text y=22 class=mt>θ°</text>`},
prs:{n:'Pressure Switch',cat:'Switching',pre:'BP',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>D.sw.g(c,o,cl)+`<text y=22 class=mt>p</text>`},
lvs:{n:'Level / Float Switch',cat:'Switching',pre:'BL',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>D.sw.g(c,o,cl)+`<text y=22 class=mt>L</text>`},
rel:{n:'Relay (with contact)',cat:'Switching',pre:'K',cv:1,xr:1,t:[[-40,-20,'A1'],[-40,20,'A2'],[40,-20,'COM'],[40,20,'NO/NC']],p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],ct:['NO','','Contact type',['NO','NC']]},cl:c=>!!c.s.en==(c.p.ct==='NO'),
 el:c=>[R(c,c.p.Rc),RR(2,3,D.rel.cl(c)?.005:1e9)],g:(c,o,cl)=>`<rect x=-28 y=-26 width=20 height=52 class="s ${c.s.en?'on':''}" /><text x=-18 y=4 class=tx>K</text><circle cx=22 cy=-20 r=2.5 class=f /><circle cx=22 cy=20 r=2.5 class=f /><path d="M22 -20L${cl?22:12} ${cl?20:8}" class=s />`},
con:{n:'Contactor (coil + 2 poles)',cat:'Switching',pre:'KM',cv:1,xr:1,t:[[-40,-20,'A1'],[-40,20,'A2'],[40,-40,'1'],[40,-20,'2'],[40,20,'3'],[40,40,'4']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},cl:c=>!!c.s.en,
 el:c=>[R(c,c.p.Rc),RR(2,3,c.s.en?.005:1e9),RR(4,5,c.s.en?.005:1e9)],g:(c,o,cl)=>`<rect x=-28 y=-26 width=20 height=52 class="s ${c.s.en?'on':''}" /><text x=-18 y=4 class=tx>KM</text><path d="M22 -40L${cl?22:12} ${cl?-20:-26}M22 20L${cl?22:12} ${cl?40:34}" class=s />`},
ton:{n:'Timer Relay ON-delay (with contact)',cat:'Switching',pre:'KT',cv:1,xr:1,t:[[-40,-20,'A1'],[-40,20,'A2'],[40,-20,'COM'],[40,20,'NO/NC']],p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],T:[3,'s','Delay time']},cl:c=>!!c.s.done,el:c=>[R(c,c.p.Rc),RR(2,3,D.ton.cl(c)?.005:1e9)],g:(c,o,cl)=>D.rel.g(c,o,cl).replace('>K<','>TON<')},

/* ---------- Control: coils (cross-referenced) and their contacts ---------- */
coil:{n:'Contactor Coil (KM)',cat:'Control',pre:'KM',cv:1,xr:1,t:vert.map((t,i)=>[t[0],t[1],['A1','A2'][i]]),p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},el:c=>[R(c,c.p.Rc)],g:c=>`<rect x=-14 y=-22 width=28 height=44 class="s ${c.s.en?'on':''}" /><path d="M-14 -22L14 22" class=s style="opacity:.25" />`},
tcoil:{n:'Timer Coil ON-delay (KT)',cat:'Control',pre:'KT',cv:1,xr:1,t:vert.map((t,i)=>[t[0],t[1],['A1','A2'][i]]),p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance'],T:[3,'s','Delay time']},el:c=>[R(c,c.p.Rc)],g:c=>`<rect x=-14 y=-22 width=28 height=44 class="s ${c.s.en?'on':''}" /><text y=-2 class=tx style="font-size:11px">TON</text><text y=12 class=mt>${c.p.T}s</text>`},
tcoff:{n:'Timer Coil OFF-delay (KT)',cat:'Control',pre:'KT',cv:1,xr:1,t:vert.map((t,i)=>[t[0],t[1],['A1','A2'][i]]),p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance'],T:[3,'s','Delay time']},el:c=>[R(c,c.p.Rc)],g:c=>`<rect x=-14 y=-22 width=28 height=44 class="s ${c.s.en||c.s.hold?'on':''}" /><text y=-2 class=tx style="font-size:11px">TOF</text><text y=12 class=mt>${c.p.T}s</text>`},
cno:{n:'Contact NO (of coil)',cat:'Control',pre:'KC',nolbl:1,bom:0,rl:1,t:[[0,-40,'13'],[0,40,'14']],p:{ref:['KM1','txt','Coil / relay label']},cl:c=>!!refOn(c),el:SW,
 g:(c,o,cl)=>`<circle cy=-22 r=2.5 class=f /><circle cy=22 r=2.5 class=f /><path d="M0 22L${cl?0:-12} ${cl?-22:-14}" class=s /><text x=10 y=-2 class=mt style="text-anchor:start">${esc(c.p.ref)}</text>`},
cnc:{n:'Contact NC (of coil)',cat:'Control',pre:'KC',nolbl:1,bom:0,rl:1,t:[[0,-40,'21'],[0,40,'22']],p:{ref:['KM1','txt','Coil / relay label']},cl:c=>!refOn(c),el:SW,
 g:(c,o,cl)=>`<circle cy=-22 r=2.5 class=f /><circle cy=22 r=2.5 class=f /><path d="M0 22L${cl?0:-12} ${cl?-22:-14}M-6 -12H0" class=s /><text x=10 y=-2 class=mt style="text-anchor:start">${esc(c.p.ref)}</text>`},
cco:{n:'Contact Changeover (of coil)',cat:'Control',pre:'KC',nolbl:1,bom:0,rl:1,t:[[0,40,'11'],[-20,-40,'12'],[20,-40,'14']],p:{ref:['KM1','txt','Coil / relay label']},cl:c=>!!refOn(c),
 el:c=>{const on=D.cco.cl(c);return[RR(0,2,on?.005:1e9),RR(0,1,on?1e9:.005)]},
 g:(c,o,cl)=>`<circle cx=-20 cy=-22 r=2.5 class=f /><circle cx=20 cy=-22 r=2.5 class=f /><circle cy=22 r=2.5 class=f /><path d="M0 22L${cl?20:-20} -22" class=s /><text x=30 y=24 class=mt style="text-anchor:start">${esc(c.p.ref)}</text>`},
cp3:{n:'Main Contacts 3-pole (of contactor)',cat:'Control',pre:'KC',nolbl:1,bom:0,rl:1,np:3,t:T3,p:{ref:['KM1','txt','Coil / relay label']},cl:c=>!!refOn(c),el:el3,g:(c,o,cl)=>P3(c,cl,'ct',c.p.ref)},

/* ---------- Sensors ---------- */
sens:{n:'Proximity Sensor',cat:'Sensors',pre:'B',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>`<path d="M0-18L18 0 0 18-18 0Z" class="s ${cl?'on':''}" /><text y=4 class=tx>PX</text>`},
lim:{n:'Limit Switch (NO)',cat:'Sensors',pre:'B',t:two,p:{},cl:c=>c.s.on,el:SW,g:(c,o,cl)=>`<circle cx=-20 r=2.5 class=f /><circle cx=20 r=2.5 class=f /><path d="M-20 0L${cl?20:14} ${cl?0:-12}M0 ${cl?-12:-26}v-6" class=s />`},
pnp:{n:'Sensor 3-wire PNP',cat:'Sensors',pre:'B',t:[[0,-40,'+'],[0,40,'−'],[40,0,'OUT']],p:{},cl:c=>c.s.on,el:c=>[RR(0,1,3000),RR(0,2,c.s.on?.5:1e9)],g:(c,o,cl)=>`<path d="M0-22L22 0 0 22-22 0Z" class="s ${cl?'on':''}" /><text y=4 class=tx style="font-size:11px">PNP</text>`},
npn:{n:'Sensor 3-wire NPN',cat:'Sensors',pre:'B',t:[[0,-40,'+'],[0,40,'−'],[40,0,'OUT']],p:{},cl:c=>c.s.on,el:c=>[RR(0,1,3000),RR(2,1,c.s.on?.5:1e9)],g:(c,o,cl)=>`<path d="M0-22L22 0 0 22-22 0Z" class="s ${cl?'on':''}" /><text y=4 class=tx style="font-size:11px">NPN</text>`},

/* ---------- Loads ---------- */
lamp:{n:'Lamp',cat:'Loads',pre:'L',t:two,p:{V:[24,'V','Rated voltage'],P:[10,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>{const b=gl(c,o);return`<circle r=28 fill="#ffd23f" opacity="${b*.55}" /><circle r=16 class=s style="fill:rgba(255,210,63,${b*.9})" /><path d="M-11-11L11 11M11-11L-11 11" class=s />`}},
htr:{n:'Heater Element',cat:'Loads',pre:'E',t:two,p:{V:[230,'V','Rated voltage'],P:[1000,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>`<rect x=-20 y=-10 width=40 height=20 class=s style="fill:rgba(255,110,0,${gl(c,o)*.6})" /><path d="M-14 0l4-6 4 12 4-12 4 12 4-12 4 6" class=s />`},
sol:{n:'Solenoid Valve',cat:'Loads',pre:'Y',t:two,p:{V:[24,'V','Coil voltage'],P:[8,'W','Coil power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>`<rect x=-20 y=-14 width=40 height=28 class="s ${gl(c,o)>.5?'on':''}" /><path d="M-10 ${gl(c,o)>.5?-8:2}V10" class=s /><text x=6 y=4 class=tx>Y</text>`},
res:{n:'Resistor',cat:'Loads',pre:'R',t:two,p:{R:[100,'Ω','Resistance'],P:[.5,'W','Power rating']},el:c=>[R(c,c.p.R)],g:()=>`<rect x=-20 y=-8 width=40 height=16 class=s />`},
cap:{n:'Capacitor',cat:'Loads',pre:'C',t:two,p:{C:[100,'µF','Capacitance']},el:c=>{const g=c.p.C*1e-6/DT;return[R(c,1/g),{k:'I',a:0,b:1,i:-g*(c.s.vc||0)}]},g:()=>`<path d="M-22 0H-4M4 0H22M-4-14V14M4-14V14" class=s />`},

/* ---------- Motors & drives ---------- */
mot:{n:'Motor (DC / 1-ph)',cat:'Motors & Drives',pre:'M',t:two,p:{V:[24,'V','Rated voltage'],P:[50,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:c=>`<circle r=22 class=s /><g transform="rotate(${c.s.ang||0})"><path d="M0 0V-16M0 0L14 8M0 0L-14 8" class=s /></g><text y=40 class=mt>M</text>`},
mot3:{n:'Motor 3-phase (U V W PE)',cat:'Motors & Drives',pre:'M',agg:1,sx:26,t:[[-20,-40,'U1'],[0,-40,'V1'],[20,-40,'W1'],[40,0,'PE','o'],[0,0,'*','h']],p:{V:[400,'V','Rated voltage (line)'],P:[1500,'W','Rated power'],wc:['Star','','Winding',['Star','Delta']]},
 el:c=>c.p.wc==='Delta'?[RR(0,1,3*c.p.V*c.p.V/c.p.P),RR(1,2,3*c.p.V*c.p.V/c.p.P),RR(2,0,3*c.p.V*c.p.V/c.p.P)]:[0,1,2].map(i=>RR(i,4,c.p.V*c.p.V/c.p.P)),g:c=>`${MOT_LEADS}<circle r=26 class=s /><g transform="rotate(${c.s.ang||0})"><circle cy=-19 r=2.5 class=f /></g><text y=-1 class=tx>M</text><text y=14 class=mt>3~ ${c.p.wc==='Delta'?'Δ':'Y'}</text>`},
vfd:{n:'Frequency Drive (VFD)',cat:'Motors & Drives',pre:'U',ns:1,sx:34,sy:40,t:TDRV,p:{P:[2200,'W','Rated power'],V:[400,'V','Supply voltage']},el:()=>[],g:DRV('VFD','3~ ⇒ 3~')},
sst:{n:'Soft Starter',cat:'Motors & Drives',pre:'U',ns:1,sx:34,sy:40,t:TDRV,p:{P:[7500,'W','Rated power'],V:[400,'V','Supply voltage']},el:()=>[],g:DRV('SOFT','STARTER')},

/* ---------- Automation (symbol only) ---------- */
plc:{n:'PLC (I/O block)',cat:'Automation',pre:'A',ns:1,hs:1,sx:34,
 t:[[-40,-60,'L+'],[-40,-40,'M'],[-40,-20,'I0.0'],[-40,0,'I0.1'],[-40,20,'I0.2'],[-40,40,'I0.3'],[40,-60,'Q0.0'],[40,-40,'Q0.1'],[40,-20,'Q0.2'],[40,0,'Q0.3'],[40,20,'1M']],p:{V:[24,'V','Supply voltage']},el:()=>[],
 bb:[-46,-106,92,170],g:c=>`<rect x=-34 y=-96 width=68 height=150 rx=3 class=s /><text y=-80 class=tx>PLC</text>`+D.plc.t.map(([x,y,n])=>`<text x=${x<0?-30:30} y=${y+3} class=mt style="text-anchor:${x<0?'start':'end'};font-size:9px">${n}</text>`).join('')},

/* ---------- Magnetics / semiconductors / instruments / connection ---------- */
xf:{n:'Transformer',cat:'Magnetics',pre:'T',t:[[-40,-20,'P1'],[-40,20,'P2'],[40,-20,'S1'],[40,20,'S2']],p:{Vp:[230,'V','Primary V'],Vs:[24,'V','Secondary V']},
 el:c=>{const n=c.p.Vs/c.p.Vp;return[{k:'V',a:2,b:3,v:n*(c.vp||0)},RR(0,1,c.p.Vp*c.p.Vp/5),{k:'I',a:0,b:1,i:n*(c.dl||0)}]},g:()=>`<circle cx=-9 r=16 class=s /><circle cx=9 r=16 class=s />`},
dio:{n:'Diode',cat:'Semiconductors',pre:'D',t:[[-40,0,'A'],[40,0,'K']],p:{},el:c=>[R(c,c.s.fw?.05:1e9)],g:()=>`<path d="M-10-12V12L10 0Z" class=f /><path d="M10-12V12" class=s />`},
led:{n:'LED',cat:'Semiconductors',pre:'H',t:[[-40,0,'A'],[40,0,'K']],p:{},el:c=>[R(c,c.s.fw?.05:1e9)],g:(c)=>`<path d="M-10-12V12L10 0Z" class="s ${c.s.fw?'on':''}" /><path d="M10-12V12M2-16l8-8M8-14l8-8" class=s />`},
term:{n:'Terminal (X)',cat:'Connection',pre:'X',t:two,p:{},el:c=>[R(c,.001)],g:()=>`<rect x=-14 y=-10 width=28 height=20 class=s /><text y=4 class=tx>X</text>`},
tpe:{n:'PE Terminal',cat:'Connection',pre:'XE',t:two,p:{},el:c=>[R(c,.001)],g:()=>`<rect x=-14 y=-10 width=28 height=20 class=s style="fill:rgba(143,196,35,.55)" /><text y=4 class=tx style="font-size:11px">PE</text>`},
nl:{n:'Net / Page Link',cat:'Connection',pre:'NL',nolbl:1,bom:0,bb:[-6,-14,60,28],t:[[0,0,'']],p:{name:['NET1','txt','Link name (same name = connected)']},el:()=>[],g:c=>`<path d="M0 0L10 -9H48V9H10Z" class=s style="fill:var(--pn2)" /><text x=29 y=4 class=tx style="font-size:11px">${esc(c.p.name)}</text>`},
vm:{n:'Voltmeter',cat:'Instruments',pre:'PV',t:two,p:{},el:c=>[R(c,1e7)],g:(c,o)=>`<circle r=18 class=s /><text y=-2 class=tx>V</text><text y=10 class=mt>${o?f(Math.abs(o.v)):''}</text>`},
am:{n:'Ammeter',cat:'Instruments',pre:'PA',t:two,p:{},el:c=>[R(c,.001)],g:(c,o)=>`<circle r=18 class=s /><text y=-2 class=tx>A</text><text y=10 class=mt>${o?f(Math.abs(o.i)):''}</text>`},

/* ---------- Annotation ---------- */
txt:{n:'Text note',cat:'Annotation',pre:'T',us:1,nolbl:1,bom:0,t:[],p:{text:['Note','txt','Text'],size:[16,'px','Size']},el:()=>[],
 bb:c=>[-4,-c.p.size-2,Math.max(30,String(c.p.text).length*c.p.size*.58)+8,c.p.size*1.5+6],g:c=>`<text class=tx style="font-size:${c.p.size}px;text-anchor:start;font-weight:400">${esc(c.p.text)}</text>`,icon:'<text x=0 y=8 class=tx style="font-size:22px">Aa</text>'},
box:{n:'Enclosure / Group Frame',cat:'Annotation',pre:'BX',us:1,bg:1,nh:1,nolbl:1,norot:1,bom:0,t:[],p:{w:[360,'px','Width'],h:[240,'px','Height'],title:['Control panel','txt','Caption']},el:()=>[],
 bb:c=>[0,-22,c.p.w,c.p.h+22],g:c=>`<rect width=${c.p.w} height=${c.p.h} class=s style="stroke-dasharray:10 6;stroke-width:1.5;stroke:var(--mu)" /><text x=8 y=-6 class=tx style="text-anchor:start;fill:var(--mu)">${esc(c.p.title)}</text>`,icon:'<rect x=-30 y=-18 width=60 height=36 class=s style="stroke-dasharray:6 4;stroke:var(--mu)" />'}
};

/* ===== variants built from other entries ===== */
D.bat={...D.dc,n:'Battery',g:()=>`<path d="M-14 -6H14M-7 6H7M0-22V-6M0 6V22" class=s /><text x=-26 y=-8 class=mt>+</text>`};
D.pbnc={...D.pb,n:'Push Button (NC)',cl:c=>!c.s.pressed};
D.estop={...D.sw,n:'Emergency Stop (NC)',cl:c=>!c.s.on,g:(c,o,cl)=>`<circle cx=-20 r=2.5 class=f /><circle cx=20 r=2.5 class=f /><path d="M-20 0L${cl?20:14} ${cl?0:-14}" class=s /><circle cy=-24 r=9 class=s style="fill:#d93a3a" />`};
D.sel2={...D.sw,n:'Selector Switch 2-pos',g:(c,o,cl)=>D.sw.g(c,o,cl)+`<path d="M0 ${cl?0:-6}V-20" class=s ${DASH} /><circle cy=-24 r=4 class=s />`};
D.limnc={...D.lim,n:'Limit Switch (NC)',cl:c=>!c.s.on};
D.rcoil={...D.coil,n:'Relay Coil (KA)',pre:'KA'};
D.pl={n:'Pilot Lamp',cat:'Loads',pre:'H',t:two,p:{V:[24,'V','Rated voltage'],P:[2,'W','Rated power'],col:['green','','Colour',['green','red','amber']]},el:D.lamp.el,g:(c,o)=>{const b=gl(c,o),k=CLR[c.p.col];return`<circle r=28 fill="rgb(${k})" opacity="${b*.45}" /><circle r=14 class=s style="fill:rgba(${k},${.15+b*.8})" /><path d="M-7-7L7 7M7-7L-7 7" class=s />`}};
D.buz={n:'Buzzer / Horn',cat:'Loads',pre:'H',t:two,p:{V:[24,'V','Rated voltage'],P:[3,'W','Rated power']},el:D.lamp.el,g:(c,o)=>`<path d="M-14 10V0a14 14 0 0 1 28 0V10Z" class=s />${gl(c,o)>.3?'<path d="M18-14q8 8 0 16M24-18q12 12 0 24" class=s style="stroke:var(--wa)" />':''}`};
const CLR={green:'61,220,151',red:'255,70,70',amber:'255,180,0'};
/* toggled in RUN mode by clicking; defaults closed */
const TOG=['sw','mcb','mccb','mcb3','mccb3','mpcb3','rcd','iso','iso3','sens','lim','limnc','estop','sel2','ths','prs','lvs','pnp','npn'];
const BRK=['mcb','mccb','mcb3','mccb3','mpcb3','rcd','iso','iso3'];
const TRIP=['mcb','mccb','mcb3','mccb3','mpcb3','rcd','ovl','ovl3'];

const DS={dc:'DC power supply',ac:'AC power supply, 1-phase',ac3:'AC power supply, 3-phase',bat:'Battery',psu:'Switch-mode power supply, AC/DC',pe:'Protective earth',
 mcb:'Miniature circuit breaker, 1P',mccb:'Moulded-case circuit breaker, 1P',mcb3:'Miniature circuit breaker, 3P',mccb3:'Moulded-case circuit breaker, 3P',mpcb3:'Motor protection circuit breaker, 3P',
 rcd:'Residual-current device (RCCB), 2P',fus:'Fuse link',iso:'Isolator switch, 1P',iso3:'Switch-disconnector, 3P',ovl:'Thermal overload relay, 1P',ovl3:'Thermal overload relay, 3P',spd:'Surge protective device',
 sw:'Toggle switch',pb:'Push button, NO',pbnc:'Push button, NC',estop:'Emergency stop, NC',sel2:'Selector switch, 2-position',sel3:'Selector switch, 3-position',ths:'Thermostat',prs:'Pressure switch',lvs:'Level / float switch',
 rel:'Control relay with contact',con:'Contactor, 2-pole with coil',ton:'Timer relay, ON-delay',coil:'Contactor (main device)',rcoil:'Control relay (coil unit)',tcoil:'Timer relay, ON-delay (coil unit)',tcoff:'Timer relay, OFF-delay (coil unit)',
 sens:'Proximity sensor',lim:'Limit switch, NO',limnc:'Limit switch, NC',pnp:'Inductive sensor, 3-wire PNP',npn:'Inductive sensor, 3-wire NPN',
 lamp:'Lamp',pl:'Pilot lamp',buz:'Buzzer / horn',htr:'Heating element',sol:'Solenoid valve',res:'Resistor',cap:'Capacitor',
 mot:'Motor, DC / 1-phase',mot3:'Three-phase induction motor',vfd:'Variable frequency drive',sst:'Soft starter',plc:'PLC controller',
 xf:'Transformer',dio:'Diode',led:'LED',term:'Terminal block',tpe:'PE terminal block',vm:'Voltmeter',am:'Ammeter'};
for(const k in D)D[k].ds=DS[k]||D[k].n;

/* ===== SVG styling shared by the editor, library icons and PDF export ===== */
const PAPERVARS='--pn:#fff;--pn2:#f1f4f8;--bd:#cdd7e1;--tx:#17283a;--mu:#6b7f92;--ac:#1a7fe0;--ok:#12a36b;--wa:#d98400;--er:#d93a3a;--w:#1f4e79;--gd:#c3ced9;--wr:#2c3e50';
const SVGCSS=`.s{fill:none;stroke:var(--w);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.s.er{stroke:var(--er)}.f{fill:var(--w)}.on{fill:rgba(61,220,151,.4)}
.tx{fill:var(--tx);font:600 13px Arial,Helvetica,sans-serif;text-anchor:middle}.mt{fill:var(--mu);font:11px Arial,Helvetica,sans-serif;text-anchor:middle}
.term{fill:#fff;stroke:var(--wa);stroke-width:1.5;cursor:crosshair}.term:hover{fill:var(--wa)}.tH{fill:transparent;cursor:crosshair}
.selr{fill:rgba(26,127,224,.07);stroke:var(--ac);stroke-dasharray:4 3;stroke-width:1.5}
.wire{fill:none;stroke:var(--wr);stroke-width:2.5;stroke-linejoin:round}.wire.v{stroke:var(--wa);opacity:.75}.wire.hot{stroke:var(--wa);stroke-width:3}.wire.sel{stroke:var(--ac)}
.fl{stroke-dasharray:3 9;animation:fl .45s linear infinite;stroke:#fff;stroke-width:3;fill:none;pointer-events:none}@keyframes fl{to{stroke-dashoffset:-12}}
.hit{fill:none;stroke:transparent;stroke-width:14;cursor:pointer}.jd{fill:var(--wr)}
.tbl{fill:#5b6b7b;font-family:Arial,Helvetica,sans-serif;font-size:8px}.tbv{fill:#10202f;font-family:Arial,Helvetica,sans-serif;font-weight:700}.zn{fill:#5b6b7b;font:9px Arial,Helvetica,sans-serif;text-anchor:middle}
.exp .term{stroke:var(--w);stroke-width:1.2}.exp .tH{display:none}`;
