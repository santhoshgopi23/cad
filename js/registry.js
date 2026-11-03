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
const fm=(v,u)=>u==='Ω'?(v>2e7?'OL':v>=1e6?(v/1e6).toFixed(2)+' MΩ':v>=1e3?(v/1e3).toFixed(2)+' kΩ':v.toFixed(1)+' Ω'):v<1?(v*1e3).toFixed(1)+' m'+u:v.toFixed(v<100?2:1)+' '+u;
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
ac:{n:'AC Supply 1-ph (RMS)',cat:'Power',pre:'V',src:1,t:[[0,-40,'L'],[0,40,'N']],p:{V:[230,'V','RMS voltage'],Imax:[50,'A','Max current']},el:c=>[{k:'V',a:0,b:1,v:c.p.V,hz:50}],g:()=>`<circle r=20 class=s /><path d="M-9 0q4.5-9 9 0t9 0" class=s />`},
ac3:{n:'AC Supply 3-ph (L1 L2 L3 N PE)',cat:'Power',pre:'V',src:1,gi:3,agg:1,vs:1,lp:[-42,-12,'end'],bb:[-44,-38,128,86],t:[[-20,40,'L1'],[0,40,'L2'],[20,40,'L3'],[40,40,'N','o'],[60,40,'PE','o']],p:{V:[400,'V','Line voltage (L-L)'],Imax:[100,'A','Max current']},
 /* L1 L2 L3 sit on the same -20 / 0 / +20 columns as 3-pole breakers, contactors and motors, so the wires drop straight down */
 el:c=>{const v=c.p.V/SQ3;return[{k:'V',a:0,b:3,v,ang:0,hz:50},{k:'V',a:1,b:3,v,ang:-120,hz:50},{k:'V',a:2,b:3,v,ang:120,hz:50}]},
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
lamp:{n:'Lamp',cat:'Loads',pre:'L',t:two,p:{V:[24,'V','Rated voltage'],P:[10,'W','Rated power'],col:['yellow','','Lamp colour',['yellow','white','red','green','blue','orange','amber','violet']]},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>{const b=gl(c,o),k=CLR[c.p.col]||CLR.yellow;return`<circle r=28 fill="rgb(${k})" opacity="${b*.55}" /><circle r=16 class=s style="fill:rgba(${k},${.08+b*.85})" /><path d="M-11-11L11 11M11-11L-11 11" class=s />`}},
htr:{n:'Heater Element',cat:'Loads',pre:'E',t:two,p:{V:[230,'V','Rated voltage'],P:[1000,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>`<rect x=-20 y=-10 width=40 height=20 class=s style="fill:rgba(255,110,0,${gl(c,o)*.6})" /><path d="M-14 0l4-6 4 12 4-12 4 12 4-12 4 6" class=s />`},
sol:{n:'Solenoid Valve',cat:'Loads',pre:'Y',t:two,p:{V:[24,'V','Coil voltage'],P:[8,'W','Coil power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:(c,o)=>`<rect x=-20 y=-14 width=40 height=28 class="s ${gl(c,o)>.5?'on':''}" /><path d="M-10 ${gl(c,o)>.5?-8:2}V10" class=s /><text x=6 y=4 class=tx>Y</text>`},
res:{n:'Resistor',cat:'Loads',pre:'R',t:two,p:{R:[100,'Ω','Resistance'],P:[.5,'W','Power rating']},el:c=>[R(c,c.p.R)],g:()=>`<rect x=-20 y=-8 width=40 height=16 class=s />`},
cap:{n:'Capacitor',cat:'Loads',pre:'C',t:two,p:{C:[100,'µF','Capacitance']},el:c=>{const g=c.p.C*1e-6/DT;return[R(c,1/g),{k:'I',a:0,b:1,i:-g*(c.s.vc||0)}]},g:()=>`<path d="M-22 0H-4M4 0H22M-4-14V14M4-14V14" class=s />`},

/* ---------- Motors & drives ---------- */
mot:{n:'Motor (DC / 1-ph)',cat:'Motors & Drives',pre:'M',t:two,p:{V:[24,'V','Rated voltage'],P:[50,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],g:c=>`<circle r=22 class=s /><g transform="rotate(${c.s.ang||0})"><path d="M0 0V-16M0 0L14 8M0 0L-14 8" class=s /></g><text y=40 class=mt>M</text>`},
mot3:{n:'Motor 3-phase (U V W PE)',cat:'Motors & Drives',pre:'M',agg:1,sx:26,t:[[-20,-40,'U1'],[0,-40,'V1'],[20,-40,'W1'],[40,0,'PE','o'],[0,0,'*','h']],
 p:{V:[400,'V','Rated voltage (line)'],P:[1500,'W','Rated power'],wc:['Star','','Winding',['Star','Delta']],fn:[50,'Hz','Rated frequency'],rpm:[1440,'rpm','Rated speed'],load:[80,'%','Load torque (of rated)'],lt:['Constant torque','','Load type',['Constant torque','Fan / pump']]},
 /* winding resistance follows frequency and load, so a drive running the motor slowly sees a sensible current */
 el:c=>{const dl=c.p.wc==='Delta',Rn=c.p.V*c.p.V/c.p.P*(dl?3:1),fr=c.s.f>1?Math.min(1.5,c.s.f/c.p.fn):1,T=Math.max(.02,c.p.load/100),pf=T*Math.pow(fr,c.p.lt==='Fan / pump'?3:1)+.03*fr,R_=Rn*fr*fr/pf;
  return dl?[RR(0,1,R_),RR(1,2,R_),RR(2,0,R_)]:[0,1,2].map(i=>RR(i,4,R_))},
 g:c=>{const rp=c.s.rpm||0;return`${MOT_LEADS}<circle r=26 class=s /><g transform=\"rotate(${c.s.ang||0})\"><circle cy=-19 r=2.5 class=f /></g><text y=-3 class=tx>M</text>`+(rp>1?`<text y=13 class=mt style=\"fill:var(--ok);font-weight:700;font-size:10px\">${Math.round(rp)} rpm</text><text y=-17 class=mt style=\"font-size:9px\">${c.s.dir<0?'⟲':'⟳'}</text>`:`<text y=14 class=mt>3~ ${c.p.wc==='Delta'?'Δ':'Y'}</text>`)}},
vfd:{n:'Frequency Drive (VFD)',cat:'Motors & Drives',pre:'U',sx:44,sy:40,
 t:[[-20,-60,'L1'],[0,-60,'L2'],[20,-60,'L3'],[-20,60,'U'],[0,60,'V'],[20,60,'W'],[-60,20,'PE','o'],[60,-20,'RUN','o'],[60,0,'REV','o'],[60,20,'COM','o'],[-60,-20,'AI1','o'],[0,-20,'*','h'],[0,20,'#','h']],
 p:{P:[2200,'W','Rated power'],V:[400,'V','Supply voltage (line)'],Imot:[4.8,'A','Motor rated current'],rpm:[1440,'rpm','Motor rated speed'],fb:[50,'Hz','Base frequency (motor)'],
  cmd:['Terminal','','Run command source',['Terminal','Keypad RUN','Keypad STOP']],rsrc:['Keypad','','Speed reference source',['Keypad','AI1 0-10V']],fset:[40,'Hz','Keypad frequency setpoint'],
  fmin:[0,'Hz','Minimum frequency'],fmax:[50,'Hz','Maximum frequency'],acc:[5,'s','Acceleration time (0 → max)'],dec:[5,'s','Deceleration time (max → 0)'],stp:['Ramp','','Stop mode',['Ramp','Coast']],
  mode:['V/f linear','','Control mode',['V/f linear','V/f quadratic']],bst:[3,'%','Torque boost (low-speed voltage)'],ilim:[150,'%','Overcurrent trip (of motor current)']},
 el:c=>{const s=c.s,p=c.p,fo=s.fo||0,r=Math.min(1,fo/p.fb);let vl=p.mode==='V/f quadratic'?r*r:r;vl=Math.min(1,vl+(fo>0?p.bst/100*(1-r):0));
  const vo=s.pw&&fo>.01&&!s.tripped?p.V*vl/SQ3:0,ang=s.dir<0?[120,-120]:[-120,120],ri=p.V*p.V/Math.max(20,s.pin||20);
  return[0,1,2].map(i=>RR(i,11,ri)).concat([{k:'V',a:3,b:12,v:vo,ang:0,hz:fo},{k:'V',a:4,b:12,v:vo,ang:ang[0],hz:fo},{k:'V',a:5,b:12,v:vo,ang:ang[1],hz:fo},RR(7,9,3000),RR(8,9,3000),RR(10,9,10000)])},
 g:c=>{const s=c.s,p=c.p,fo=s.fo||0,rpm=Math.round(fo/p.fb*p.rpm),run=fo>.05,
  st=s.tripped?'FAULT  OC':!s.pw?'NO POWER':run?(s.dir<0?'REV':'FWD')+(s.rq?'':'  STOP'):s.rq?'START':'READY',ok=s.tripped?'#ff6b6b':'#6cf5a4',mono='font-family:monospace;text-anchor:middle';
  const lb=(a,x,y,an)=>`<text x=${x} y=${y} class=mt style=\"font-size:8px;text-anchor:${an}\">${a}</text>`;
  return`<rect x=-44 y=-40 width=88 height=80 rx=3 class=s /><rect x=-38 y=-34 width=76 height=46 rx=2 style=\"fill:#12301f;stroke:var(--w);stroke-width:1\" />`+
   `<text y=-16 style=\"fill:${ok};font-weight:700;font-size:15px;${mono}\">${fo.toFixed(1)} Hz</text><text y=-3 style=\"fill:${ok};font-size:11px;${mono}\">${rpm} rpm</text><text y=9 style=\"fill:${ok};font-size:9px;${mono}\">${st}</text>`+
   `<text y=24 class=mt>${(s.io||0).toFixed(1)} A · ${(s.vo||0).toFixed(0)} V</text><text y=35 class=mt>Set ${(s.fref||0).toFixed(1)} Hz · ${p.mode==='V/f linear'?'V/f':'V/f²'}</text>`+
   ['L1','L2','L3'].map((n,i)=>lb(n,-11+i*20,-45,'start')).join('')+['U','V','W'].map((n,i)=>lb(n,-11+i*20,55,'start')).join('')+
   lb('AI1',-52,-23,'middle')+lb('PE',-52,17,'middle')+lb('RUN',52,-23,'middle')+lb('REV',52,-3,'middle')+lb('COM',52,17,'middle')}},
pot:{n:'Potentiometer (speed pot)',cat:'Motors & Drives',pre:'RV',t:[[0,-40,'1'],[0,40,'3'],[40,0,'W']],p:{R:[10000,'Ω','Total resistance'],pos:[50,'%','Wiper position (0–100)']},
 el:c=>{const a=Math.max(.001,Math.min(.999,c.p.pos/100));return[RR(0,2,c.p.R*(1-a)),RR(2,1,c.p.R*a)]},
 g:c=>{const y=22-44*Math.max(0,Math.min(1,c.p.pos/100));return`<rect x=-8 y=-22 width=16 height=44 class=s /><path d=\"M22 0V${y}H8\" class=s /><path d=\"M8 ${y}l7-4v8z\" class=f />`}},
con3:{n:'Contactor 3-pole (coil + 3 poles)',cat:'Switching',pre:'KM',cv:1,xr:1,np:3,sx:50,t:[[-60,-20,'A1'],[-60,20,'A2'],[-20,-40,'1'],[0,-40,'3'],[20,-40,'5'],[-20,40,'2'],[0,40,'4'],[20,40,'6']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},cl:c=>!!c.s.en,
 el:c=>[R(c,c.p.Rc),...[0,1,2].map(i=>RR(2+i,5+i,c.s.en?.005:1e9))],g:(c,o,cl)=>P3(c,cl,'ct','')+`<rect x=-50 y=-26 width=20 height=52 class=\"s ${c.s.en?'on':''}\" /><text x=-40 y=4 class=tx>KM</text>`},
sst:{n:'Soft Starter',cat:'Motors & Drives',pre:'U',ns:1,sx:34,sy:40,t:TDRV,p:{P:[7500,'W','Rated power'],V:[400,'V','Supply voltage']},el:()=>[],g:DRV('SOFT','STARTER')},

/* ---------- Automation (the PLC is redefined in plc.js) ---------- */
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

mltm:{n:'Multimeter (DMM)',cat:'Instruments',pre:'PM',sy:48,bb:[-40,-60,80,128],t:[[-20,60,'VΩ','o'],[0,60,'A (10 A)','o'],[20,60,'COM','o']],p:{mode:['V','','Function',['V','A','Ω']]},
 el:c=>{const m=c.p.mode;return[RR(0,2,m==='Ω'?1e9:1e7),RR(1,2,m==='A'?.001:1e9),{k:'I',a:0,b:2,i:m==='Ω'?1e-3:0}]},
 g:c=>{const m=c.p.mode,rdg=c.s.rd||0,u=m==='Ω'?'Ω':m,ang={V:-55,A:0,'Ω':55}[m],lcd='fill:#1b2a12;font:700 12px ui-monospace,Menlo,Consolas,monospace;text-anchor:middle',tk='fill:#222;font:700 8px Arial;text-anchor:middle';
  return`<rect x=-36 y=-56 width=72 height=104 rx=9 style=\"fill:#f2c200;stroke:#2e2e2e;stroke-width:2\" /><rect x=-30 y=-50 width=60 height=32 rx=3 style=\"fill:#c9d8a6;stroke:#2e2e2e;stroke-width:1.5\" />`+
   `<text y=-30 style=\"${lcd}\">${c.o||c.s.rd!=null?fm(rdg,u):'---'}</text><text x=-26 y=-21 style=\"fill:#1b2a12;font:700 7px Arial\">${m==='V'?'AC/DC':m==='A'?'AUTO':'OHM'}</text>`+
   `<circle cy=-2 r=15 style=\"fill:#2b2b2b;stroke:#111;stroke-width:1.5\" /><g transform=\"rotate(${ang} 0 -2)\"><path d=\"M0 -2V-14\" style=\"stroke:#f2c200;stroke-width:3;stroke-linecap:round\" /></g>`+
   `<text x=-22 y=-12 style=\"${tk}\">V</text><text y=-20 style=\"${tk};display:none\"></text><text x=22 y=-12 style=\"${tk}\">Ω</text><text y=-22 style=\"${tk}\"></text><text x=0 y=26 style=\"${tk}\">A</text>`+
   `<text x=-20 y=42 style=\"${tk}\">VΩ</text><text x=0 y=42 style=\"${tk}\">A</text><text x=20 y=42 style=\"${tk}\">COM</text>`}},
finj:{n:'Fault Injector',cat:'Instruments',pre:'FI',t:two,p:{type:['Short circuit','','Fault type',['Short circuit','Open circuit','Leakage (500 Ω)']]},
 el:c=>{const on=c.s.on,t=c.p.type;return[R(c,t==='Open circuit'?(on?1e9:.001):on?(t==='Short circuit'?.01:500):1e9)]},
 g:c=>{const on=c.s.on,k=on?'var(--er)':'var(--wa)';return`<rect x=-20 y=-18 width=40 height=36 rx=4 style=\"fill:${on?'rgba(217,58,58,.18)':'none'};stroke:${k};stroke-width:2;stroke-dasharray:${on?'0':'5 3'}\" /><path d=\"M-3 -13L-9 2H-1L-5 13L9 -5H1L5 -13Z\" style=\"fill:${k};stroke:none\" /><text y=30 class=mt style=\"fill:${k};font-weight:700\">${on?'FAULT':'ARMED'}</text>`}},
ind:{n:'Reactor / Choke',cat:'Magnetics',pre:'L',t:two,p:{L:[2,'mH','Inductance (info)'],R:[.05,'Ω','Winding resistance']},el:c=>[R(c,c.p.R)],g:()=>`<path d=\"M-20 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0a5 5 0 0 1 10 0\" class=s />`},

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
D.pl={n:'Pilot Lamp',cat:'Loads',pre:'H',t:two,p:{V:[24,'V','Rated voltage'],P:[2,'W','Rated power'],col:['green','','Colour',['green','red','amber','yellow','blue','white','orange','violet']]},el:D.lamp.el,g:(c,o)=>{const b=gl(c,o),k=CLR[c.p.col];return`<circle r=28 fill="rgb(${k})" opacity="${b*.45}" /><circle r=14 class=s style="fill:rgba(${k},${.15+b*.8})" /><path d="M-7-7L7 7M7-7L-7 7" class=s />`}};
D.buz={n:'Buzzer / Horn',cat:'Loads',pre:'H',t:two,p:{V:[24,'V','Rated voltage'],P:[3,'W','Rated power']},el:D.lamp.el,g:(c,o)=>`<path d="M-14 10V0a14 14 0 0 1 28 0V10Z" class=s />${gl(c,o)>.3?'<path d="M18-14q8 8 0 16M24-18q12 12 0 24" class=s style="stroke:var(--wa)" />':''}`};
D.brr={...D.res,n:'Braking Resistor',cat:'Motors & Drives',pre:'RB',p:{R:[100,'Ω','Resistance'],P:[500,'W','Power rating']},g:()=>`<rect x=-20 y=-8 width=40 height=16 class=s /><path d=\"M-12 6L12 -6M8 -6h4v4\" class=s />`};
D.bcn={...D.pl,n:'Beacon / Strobe Light',pre:'H',p:{...D.pl.p,col:['amber','','Colour',['amber','red','green','blue','white','yellow','orange','violet']]},g:(c,o)=>D.pl.g(c,o)+`<path d=\"M-22 -22l-6 -6M22 -22l6 -6M0 -30v-8\" class=s />`};
D.ky={...D.sw,n:'Key Switch',pre:'S',g:(c,o,cl)=>D.sw.g(c,o,cl)+`<circle cy=-26 r=5 class=s /><path d=\"M0 -21V-8\" class=s />`};
const CLR={green:'61,220,151',red:'255,70,70',amber:'255,180,0',yellow:'255,210,63',white:'255,250,235',blue:'60,140,255',orange:'255,120,20',violet:'170,100,255'};
/* ---- Tower light / stack light (signal tower): up to 5 lamps (red, amber, green, blue, white) + optional buzzer, one common (−) ----
   Terminals (fixed index so saved wires survive a change of settings): 0 R  1 A  2 G  3 B  4 W  5 BZ  6 COM.
   Only the lamps in use are shown, stacked top to bottom in the same order as on the real tower; each lamp is a resistor V²/P to COM. */
const TWC=[['R','red','red'],['A','amber','amber'],['G','green','green'],['B','blue','blue'],['W','white','white']];
const twN=c=>Math.max(1,Math.min(5,parseInt(c.p.n)||3)),twBz=c=>c.p.bz==='Yes';
const twAct=c=>{const a=[];for(let i=0;i<twN(c);i++)a.push(i);if(twBz(c))a.push(5);a.push(6);return a};   /* terminal indices in use, top → bottom */
const twDv={};
const twDyn=c=>{const key=twN(c)+(twBz(c)?'b':''),a=twAct(c);if(!twDv[key]){const nm=['R (red lamp +)','A (amber lamp +)','G (green lamp +)','B (blue lamp +)','W (white lamp +)','BZ (buzzer +)','COM (common −)'];
 twDv[key]=Object.assign(Object.create(D.twr),{t:nm.map((n,i)=>{const k=a.indexOf(i);return k<0?[0,0,n,'oh']:[-40,-(a.length-1)*10+20*k,n,i===6?'':'o']}),bb:[-46,-(a.length-1)*10-16,92,(a.length-1)*20+32],sx:14})}return twDv[key]};
D.twr={n:'Tower Light (stack light)',ds:'Signal tower with up to five lamps (red, amber, green, blue, white) and an optional buzzer, one common terminal',cat:'Loads',pre:'H',sx:14,hs:1,
 t:[[-40,-30,'R (red lamp +)','o'],[-40,-10,'A (amber lamp +)','o'],[-40,10,'G (green lamp +)','o'],[0,0,'B (blue lamp +)','oh'],[0,0,'W (white lamp +)','oh'],[0,0,'BZ (buzzer +)','oh'],[-40,30,'COM (common −)']],bb:[-46,-46,92,92],
 p:{n:['3','','Number of lamps (1…5: red, amber, green, blue, white)',['1','2','3','4','5']],bz:['No','','Buzzer',['No','Yes']],V:[24,'V','Rated voltage'],P:[3,'W','Power per lamp'],Pb:[3,'W','Buzzer power']},
 dyn:twDyn,chg:(c,k)=>{if(k==='n'||k==='bz'){vlPrune(c);return true}return false},
 el:c=>twAct(c).slice(0,-1).map((ti,j)=>RR(ti,6,c.p.V*c.p.V/Math.max(.01,ti===5?c.p.Pb:c.p.P))),
 sim:(c,E)=>{const a=twAct(c).slice(0,-1),s=c.s;s.lp=a.map((ti,j)=>{const e=E[j],pw=e?Math.abs(e.vr*e.cr+e.vi*e.ci):0;return pw/Math.max(.01,ti===5?c.p.Pb:c.p.P)});s.lv=a.map((ti,j)=>E[j]?Math.hypot(E[j].vr,E[j].vi):0);s.lt=a;return 0},
 fin:c=>{const s=c.s,a=s.lt||[];let i=0,p=0,v=0;(s.lp||[]).forEach((b,j)=>{const P=a[j]===5?c.p.Pb:c.p.P;p+=b*P;i+=b*P/Math.max(1e-6,c.p.V);v=Math.max(v,(s.lv||[])[j]||0)});c.o={v,i,p}},
 st:c=>{const s=c.s,a=s.lt||[];return (s.lp||[]).map((b,j)=>b>.3?(a[j]===5?'BZ':TWC[a[j]][0]):'').filter(Boolean).join(' ')||'off'},
 msg:c=>{const s=c.s,r=[];if(!S.run||!s.lp)return r;
  (s.lv||[]).forEach((v,j)=>{if(v>1.15*c.p.V)r.push(['wa',`${c.label}: ${s.lt[j]===5?'buzzer':TWC[s.lt[j]][1]+' lamp'} overvoltage ${v.toFixed(1)} V (rated ${c.p.V} V)`])});return r},
 pp:c=>`<p class=mu><b>Wiring:</b> connect the <b>COM</b> terminal to the supply negative (or neutral) and switch the <b>+</b> of each lamp (<b>R, A, G${twN(c)>3?', B'+(twN(c)>4?', W':''):''}${twBz(c)?', BZ':''}</b>) with a contactor, PLC output or relay contact. Lamps are listed top to bottom like on the real tower.${S.run&&c.s.lp?'<br><b>Now on:</b> '+D.twr.st(c):''}</p>`,
 g:(c,o)=>{const a=twAct(c),n=a.length,y0=-(n-1)*10,lp=(o&&c.s.lp)||[];let h='';
  a.forEach((ti,k)=>{const y=y0+20*k;
   if(ti===6){h+=`<rect x=-14 y=${y-8} width=44 height=16 rx=2 class=s style="fill:#9aa5b1" /><text x=8 y=${y+4} class=mt style="font-size:7px;font-weight:700;fill:#10202f">COM</text>`;return}
   if(ti===5){const b=Math.min(1.3,lp[k]||0);h+=`<rect x=-14 y=${y-10} width=44 height=20 rx=2 class=s style="fill:#46505c" /><path d="M-4 ${y+5}V${y-1}a8 8 0 0 1 16 0V${y+5}Z" class=s style="fill:#cfd6dd" />${b>.3?`<path d="M18 ${y-8}q7 8 0 16M24 ${y-12}q11 12 0 24" class=s style="stroke:var(--wa)" />`:''}<text x=28 y=${y+3} class=mt style="font-size:6px;text-anchor:end;fill:#fff">BZ</text>`;return}
   const k2=CLR[TWC[ti][2]],b=Math.min(1.3,lp[k]||0);
   h+=(b>.05?`<rect x=-20 y=${y-13} width=56 height=26 rx=5 fill="rgb(${k2})" opacity="${Math.min(.55,b*.5)}" />`:'')+`<rect x=-14 y=${y-10} width=44 height=20 rx=3 class=s style="fill:rgba(${k2},${.18+Math.min(1,b)*.78})" /><path d="M-14 ${y-4}H30M-14 ${y+4}H30" class=s style="stroke:rgba(16,32,47,.18);stroke-width:1" /><text x=8 y=${y+3} class=mt style="font-size:7px;font-weight:700;fill:#10202f">${TWC[ti][0]}</text>`});
  return h+`<path d="M-8 ${y0-10}V${y0-16}h32V${y0-10}" class=s style="fill:#46505c" />`}};

/* ---- Fused terminal block (DIN-rail fuse terminal) with blown-fuse indicator LED ----
   Behaves like the Fuse (blows above its rating, "Replace fuse" in Properties). The red LED sits across the fuse, like on the real terminal:
   it lights only when the fuse is blown AND there is voltage across it (supply on one side, load on the other). */
D.fut={n:'Fused Terminal (blown-fuse LED)',ds:'DIN-rail fused terminal block with a red LED that lights when the fuse is blown',cat:'Protection',pre:'XF',
 t:[[0,-40,'1 (in)'],[0,40,'2 (out)']],p:{I:[6,'A','Fuse rating'],V:[24,'V','LED rated voltage (lights when a blown fuse has ≥ 30% of it across)']},
 cl:c=>!c.s.blown,el:SW,
 sim:(c,E)=>{const e=E[0],v=Math.hypot(e.vr,e.vi);c.s.vx=v;return 0},
 pp:c=>`<p class=mu>${c.s.blown?(c.s.vx>=.3*c.p.V?'<b style="color:var(--er)">● Fuse blown – red LED ON.</b> Press <b>Replace fuse</b> below after fixing the fault.':'Fuse blown, but there is no voltage across it, so the LED stays off.'):'Fuse OK – LED off.'}</p><p class=mu>Wire the supply to <b>1</b> and the load to <b>2</b>. The terminal blows above its rating like a normal fuse.</p>`,
 g:c=>{const bl=!!c.s.blown,on=bl&&S.run&&(c.s.vx||0)>=.3*c.p.V,fz=bl?'er':'';
  return`<rect x=-14 y=-22 width=28 height=44 rx=3 class=s style="fill:#dfe5ea" /><path d="M0 -22V-14M0 14V22" class=s />`+
   `<rect x=-5 y=-14 width=10 height=28 rx=2 class="s ${fz}" style="fill:${bl?'#ffe3e3':'#fff'}" /><path d="${bl?'M0 -14V-5M0 5V14':'M0 -14V14'}" class="s ${fz}" />`+
   (on?`<circle cx=21 r=11 fill="rgb(255,60,60)" opacity=".4" />`:'')+`<circle cx=21 r=5 class=s style="fill:${on?'#ff2a2a':bl?'#8a2a2a':'#5b6773'}" /><path d="M14 0H16" class=s />`+
   `<text x=-18 y=3 class=mt style="text-anchor:end;font-size:8px;font-weight:700">${c.p.I}A</text>`}};

/* ---- Panel exhaust / cooling fan (axial fan with grille, as fitted in a control panel). Resistive load V²/P; the blades spin with the power it gets ---- */
D.fan={n:'Panel Exhaust Fan',ds:'Axial cooling / exhaust fan for a control panel (AC or DC), blades turn when powered',cat:'Motors & Drives',pre:'FN',
 t:[[-40,0,'1 (L / +)'],[40,0,'2 (N / −)']],
 p:{V:[230,'V','Rated voltage (230 for AC, 24 for DC fans)'],P:[20,'W','Rated power'],sz:['120 mm','','Fan size',['80 mm','92 mm','120 mm','150 mm','172 mm']],af:[100,'m³/h','Air flow at rated voltage (info)']},
 el:c=>[R(c,c.p.V*c.p.V/Math.max(.01,c.p.P))],
 tk:c=>{const s=c.s,r=c.o&&S.run?Math.min(1.15,Math.max(0,c.o.p/Math.max(.01,c.p.P))):0,tg=r<.15?0:Math.min(1.15,Math.sqrt(r))*900;s.w=(s.w||0)+(tg-(s.w||0))*Math.min(1,DT*4);s.ang=((s.ang||0)+s.w*DT)%360},
 st:c=>{const r=c.o?c.o.p/Math.max(.01,c.p.P):0;return r<.15?'OFF':'RUNNING '+Math.round(Math.min(1.15,Math.sqrt(r))*100)+'%'},
 msg:c=>{const r=[];if(S.run&&c.o){const v=Math.abs(c.o.v);if(v>1.15*c.p.V)r.push(['wa',`${c.label}: overvoltage ${v.toFixed(0)} V (rated ${c.p.V} V)`]);else if(v>.05*c.p.V&&v<.8*c.p.V)r.push(['wa',`${c.label}: undervoltage ${v.toFixed(0)} V (rated ${c.p.V} V) – the fan turns slowly and moves less air`])}return r},
 pp:c=>{const r=c.o&&S.run?Math.min(1.15,Math.sqrt(Math.max(0,c.o.p/Math.max(.01,c.p.P)))):0;return`<p class=mu>${S.run?(r<.2?'Fan is <b>stopped</b> (no supply).':`Running at <b>${Math.round(r*100)}%</b> speed, about <b>${Math.round(c.p.af*r)} m³/h</b> of air, ${c.o.p.toFixed(1)} W.`):'Press ▶ Run to see the fan turn.'}</p><p class=mu>Connect the supply to <b>1</b> and <b>2</b> (L / N for an AC fan, + / − for a DC fan). Put a thermostat (<i>Switching → Thermostat</i>) in series to start the fan only when the panel gets hot.</p>`},
 g:c=>{const a=c.s.ang||0,fast=S.run&&(c.s.w||0)>300;let bl='';for(let i=0;i<5;i++)bl+=`<path transform="rotate(${72*i})" d="M0 0C5 -5 12 -11 6 -17C-1 -16 -4 -7 0 0Z" style="fill:#8aa0b2;stroke:#173d57;stroke-width:1" />`;
  return`<rect x=-22 y=-22 width=44 height=44 rx=6 class=s style="fill:#e4e9ee" /><circle r=19 class=s style="fill:#f7fafc" />`+(fast?`<circle r=17 style="fill:#8aa0b2;opacity:.22" />`:'')+`<g transform="rotate(${a})">${bl}</g><circle r=4 class=s style="fill:#46505c" />`+
   [[-17,-17],[17,-17],[-17,17],[17,17]].map(q=>`<circle cx=${q[0]} cy=${q[1]} r=1.6 style="fill:#46505c" />`).join('')}};

/* toggled in RUN mode by clicking; defaults closed */
const TOG=['finj','ky','sw','mcb','mccb','mcb3','mccb3','mpcb3','rcd','iso','iso3','sens','lim','limnc','estop','sel2','ths','prs','lvs','pnp','npn'];
const BRK=['mcb','mccb','mcb3','mccb3','mpcb3','rcd','iso','iso3'];
const TRIP=['mcb','mccb','mcb3','mccb3','mpcb3','rcd','ovl','ovl3'];

const DS={dc:'DC power supply',ac:'AC power supply, 1-phase',ac3:'AC power supply, 3-phase',bat:'Battery',psu:'Switch-mode power supply, AC/DC',pe:'Protective earth',
 mcb:'Miniature circuit breaker, 1P',mccb:'Moulded-case circuit breaker, 1P',mcb3:'Miniature circuit breaker, 3P',mccb3:'Moulded-case circuit breaker, 3P',mpcb3:'Motor protection circuit breaker, 3P',
 rcd:'Residual-current device (RCCB), 2P',fus:'Fuse link',fan:'Panel exhaust / cooling fan',fut:'Fused terminal block with blown-fuse LED',iso:'Isolator switch, 1P',iso3:'Switch-disconnector, 3P',ovl:'Thermal overload relay, 1P',ovl3:'Thermal overload relay, 3P',spd:'Surge protective device',
 sw:'Toggle switch',pb:'Push button, NO',pbnc:'Push button, NC',estop:'Emergency stop, NC',sel2:'Selector switch, 2-position',sel3:'Selector switch, 3-position',ths:'Thermostat',prs:'Pressure switch',lvs:'Level / float switch',
 rel:'Control relay with contact',con:'Contactor, 2-pole with coil',ton:'Timer relay, ON-delay',coil:'Contactor (main device)',rcoil:'Control relay (coil unit)',tcoil:'Timer relay, ON-delay (coil unit)',tcoff:'Timer relay, OFF-delay (coil unit)',
 sens:'Proximity sensor',lim:'Limit switch, NO',limnc:'Limit switch, NC',pnp:'Inductive sensor, 3-wire PNP',npn:'Inductive sensor, 3-wire NPN',
 lamp:'Lamp',pl:'Pilot lamp',buz:'Buzzer / horn',htr:'Heating element',sol:'Solenoid valve',res:'Resistor',cap:'Capacitor',
 mot:'Motor, DC / 1-phase',mot3:'Three-phase induction motor',vfd:'Variable frequency drive (V/f, ramps, keypad display)',pot:'Potentiometer (analogue speed reference)',con3:'Contactor, 3-pole with coil',sst:'Soft starter',plc:'PLC: 8 inputs, 8 relay outputs, ladder logic (double-click to program)',
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
.term.air{stroke:#0b7fd1;stroke-width:2}.term.air:hover{fill:#0b7fd1}
.wire.air{stroke:#9bbfdc}.amk{fill:none;stroke:#9bbfdc;stroke-width:9;stroke-dasharray:2 20;pointer-events:none}.afl{fill:none;stroke:#fff;stroke-width:1.8;stroke-dasharray:2 10;animation:fl .6s linear infinite;pointer-events:none}
.exp .term{stroke:var(--w);stroke-width:1.2}.exp .term.air{stroke:#0b7fd1}.exp .tH{display:none}`;
