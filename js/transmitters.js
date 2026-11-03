/* ElectroSim v8 – industrial transmitters (pressure, temperature, level, flow, weight, …).
   Every transmitter has a manually entered process value (Properties, the − / + buttons on the symbol, or 0-100 % buttons)
   and turns it into a standard signal. The wiring is chosen in Properties ("Transmitter type"), like on a real instrument:
   2-wire  – loop powered 4-20 mA (+ / −, needs ≥ 10 V across it)
   3-wire  – + / − supply, OUT signal (4-20 mA sourcing or 0-10 V), signal returns through the common 0 V
   4-wire  – V+ / V− supply and an isolated, active output S+ / S− (4-20 mA or 0-10 V)
   The ❓ Help button in Properties explains how the sensor works and shows the wiring diagram (txHelp at the end of this file).
   Add a new one by adding a line to TXD below. Loaded after plc.js (uses plcPrune). */
'use strict';
/* key, name, label prefix, units (first = default), default range low / high, default value, glyph, description */
const TXD=[
 ['ptx','Pressure transmitter','PT',['bar','psi','kPa','MPa','mbar','Pa'],0,10,5,'p','Gauge / absolute pressure transmitter'],
 ['dpt','Differential pressure transmitter','DPT',['mbar','kPa','Pa','inH2O','bar','psi'],0,250,100,'p','Differential pressure (filters, flow orifice, level)'],
 ['ttx','Temperature transmitter (RTD / TC)','TT',['°C','°F','K'],-50,150,25,'t','Pt100 / thermocouple head transmitter'],
 ['ltx','Level transmitter','LT',['%','m','mm','cm','ft','in'],0,100,50,'l','Tank level (hydrostatic / radar / ultrasonic)'],
 ['ftx','Flow transmitter','FT',['m³/h','L/min','L/s','GPM','kg/h','t/h'],0,100,40,'f','Flow transmitter (magnetic, vortex, coriolis)'],
 ['wtx','Weight transmitter (load cell)','WT',['kg','g','t','lb','N','kN'],0,1000,250,'w','Load-cell / weighing transmitter'],
 ['htx','Humidity transmitter','HT',['%RH'],0,100,50,'h','Relative humidity transmitter'],
 ['phx','pH transmitter','AT',['pH'],0,14,7,'x:pH','pH analyser transmitter'],
 ['ctx','Conductivity transmitter','CT',['µS/cm','mS/cm','mS/m'],0,2000,500,'x:µS','Conductivity analyser transmitter'],
 ['otx','Dissolved oxygen transmitter','OT',['mg/L','ppm','%sat'],0,20,8,'x:O₂','Dissolved oxygen analyser'],
 ['ntx','Turbidity transmitter','NT',['NTU','FNU'],0,100,10,'x:NTU','Turbidity analyser'],
 ['vtx','Vibration transmitter','VT',['mm/s','in/s','g'],0,25,5,'x:≈','Machine vibration transmitter'],
 ['gtx','Gas detector transmitter','GT',['%LEL','ppm','%vol'],0,100,0,'x:GAS','Combustible / toxic gas transmitter'],
 ['stx','Speed transmitter','ST',['rpm','Hz','m/s'],0,3000,1500,'x:rpm','Speed / frequency transmitter'],
 ['xtx','Position / displacement transmitter','ZT',['mm','%','cm','in','°'],0,100,50,'x:↔','Linear / angular position transmitter (valve position)'],
 ['qtx','Torque / force transmitter','QT',['N·m','N','kN','lbf'],0,500,100,'x:N·m','Torque or force transmitter'],
 ['dtx','Density transmitter','DT',['kg/m³','g/cm³','SG'],0,2000,1000,'x:ρ','Density / specific gravity transmitter'],
 ['itx','Current transducer','IT',['A','mA','kA'],0,100,10,'x:A','AC / DC current transducer'],
 ['etx','Voltage transducer','ET',['V','kV','mV'],0,500,230,'x:V','AC / DC voltage transducer'],
 ['ktx','Power transducer','JT',['kW','W','MW','kVA'],0,100,30,'x:kW','Active power transducer'],
 ['gen','Universal transmitter (custom unit)','XT',null,0,100,50,'x:XT','Any signal: enter your own unit text, range and value']];
const TXW=['2-wire (loop powered)','3-wire (common 0 V)','4-wire (separate supply)'],TXS=['4-20 mA','0-10 V'],
 TXL=['4-20 mA 2-wire (loop powered)','0-10 V 3-wire'],            /* older project files stored wiring + signal in one text */
 TXF=['None','Burnout low (3.6 mA / 0 V)','Burnout high (21 mA / 10.5 V)'];
const txV=x=>{const a=Math.abs(x);return(a>=1000?x.toFixed(0):a>=100?x.toFixed(1):x.toFixed(2))};
const txT2=[[-20,-60,'+'],[20,-60,'−'],[0,-60,'OUT','h']],txT3=[[-20,-60,'+'],[20,-60,'−'],[0,-60,'OUT']],
 txT4=[[-36,-60,'V+'],[-12,-60,'V−'],[12,-60,'S+'],[36,-60,'S−']];
/* wiring + signal in one consistent state (also converts projects saved before the wiring selector existed) */
function txNorm(c){const p=c.p;
 if(p.out===TXL[0]){p.wire=TXW[0];p.out=TXS[0]}else if(p.out===TXL[1]){p.wire=TXW[1];p.out=TXS[1]}
 if(!TXW.includes(p.wire))p.wire=TXW[0];
 if(p.wire===TXW[0]||!TXS.includes(p.out))p.out=TXS[0]}
const txN=c=>{txNorm(c);return TXW.indexOf(c.p.wire)+2};            /* 2, 3 or 4 wires */
const txVolt=c=>txN(c)>2&&c.p.out===TXS[1];                         /* 0-10 V output (3- / 4-wire only) */
const txSpan=c=>{const lo=+c.p.lo,hi=+c.p.hi;return hi>lo?hi-lo:1};
const txPct=c=>((+c.p.val-(+c.p.lo))/txSpan(c))*100;                 /* % of span, not clamped */
/* signal produced for the current value: mA or V */
function txOut(c){const p=txPct(c),f=TXF.indexOf(c.p.fault);
 if(txVolt(c))return f===1?0:f===2?10.5:Math.max(0,Math.min(10.5,p/10));
 return f===1?3.6:f===2?21:Math.max(3.8,Math.min(20.5,4+p*.16))}
const txLay={};
function txDef(base,n){const k=base+n;return txLay[k]||(txLay[k]=Object.assign(Object.create(D[base]),{t:n===2?txT2:n===3?txT3:txT4,bb:n===4?[-56,-72,112,128]:D[base].bb}))}
/* wires on terminals the chosen wiring does not have are removed */
function txPrune(c){const t=dd(c).t,bad=k=>{const[id,i]=String(k).split('.');return +id===c.id&&(!t[+i]||hidT(t[+i]))},n0=S.wires.length;
 S.wires=S.wires.filter(w=>!(bad(w.a)||bad(w.b)));return n0-S.wires.length}
function txWireChg(c){txNorm(c);c.s.lim=0;c.s.cl=0;const n=txPrune(c);if(n)toast(n+' wire'+(n>1?'s':'')+' on removed terminals deleted');S.dirty=1;if(typeof commit==='function')commit()}
function txGlyph(g){
 if(g==='p')return'<circle cx=0 cy=32 r=8.5 class=s /><path d="M0 32L5 27M0 23.5V25M-8.5 32H-7M8.5 32H7" class=s />';
 if(g==='t')return'<path d="M-2.5 22V33a5 5 0 1 0 5 0V22a2.5 2.5 0 0 0-5 0Z" class=s /><path d="M0 26V35" class=s />';
 if(g==='l')return'<path d="M-10 22V41H10V22" class=s /><path d="M-10 31q5-3.5 10 0t10 0" class=s />';
 if(g==='f')return'<path d="M-13 27H13M-13 39H13M-6 33H6M2 30l4 3-4 3" class=s />';
 if(g==='w')return'<path d="M-11 41H11M-7 41L-4 26H4L7 41M-6 26H6" class=s />';
 if(g==='h')return'<path d="M0 22C5 29 8 33 8 36a8 8 0 0 1-16 0c0-3 3-7 8-14Z" class=s />';
 return`<text y=36 style="font:700 10px Arial;fill:#12293a;text-anchor:middle">${esc(g.slice(2))}</text>`}
function txMake(row){const[key,name,pre,units,lo,hi,val,gl,ds]=row,u=c=>c.p.unit;
 const p={unit:units?[units[0],'','Engineering unit',units]:['units','txt','Unit text'],
  lo:[lo,u,'Range low (4 mA / 0 V)'],hi:[hi,u,'Range high (20 mA / 10 V)'],val:[val,u,'Process value (enter it here)'],
  wire:[TXW[0],'','Transmitter type (wires)',TXW],
  out:[TXS[0],'','Output signal',c=>txN(c)===2?[TXS[0]]:TXS],
  fault:[TXF[0],'','Simulate sensor fault',TXF]};
 D[key]={n:name,ds,cat:'Transmitters',pre,anyNum:1,t:txT2,sy:22,bb:[-44,-72,88,128],p,sn:gl.length===1?gl:'',
  dyn:c=>txDef(key,txN(c)),
  help:c=>txHelp(c),
  chg:(c,k)=>{if(k==='wire'||k==='out'){txWireChg(c);return true}if(k==='unit')return true;return false},
  el:c=>{const n=txN(c),o=txOut(c),s=c.s,pw=!!s.pw;
   if(n===2)return[RR(0,1,1e9),s.lim?RR(0,1,10/Math.max(o/1e3,1e-6)):{k:'I',a:0,b:1,i:o/1e3}];
   const sup=RR(0,1,pw?1200:1e9),rt=n===3?1:3;                          /* supply draws ~20 mA at 24 V; signal returns to − (3-wire) or S− (4-wire) */
   if(txVolt(c))return[sup,{k:'V',a:2,b:rt,v:pw?o:0}];
   const i=pw?o/1e3:0;                                                  /* active 4-20 mA output: current source with a compliance limit */
   return[sup,{k:'I',a:rt,b:2,i},RR(2,rt,s.cl&&i>0?Math.max(s.vm||0,1)/i:1e9)]},
  sim:(c,E)=>{const s=c.s,n=txN(c),vt=E[0].v2;let ch=0;
   if(n===2){const pw=vt>=1;if(pw!==!!s.pw){s.pw=pw;ch=1}
    let nl=s.lim?1:0;if(!nl&&vt<9.8&&vt>=1)nl=1;else if(nl&&vt>=10.2)nl=0;
    if(nl!==(s.lim?1:0)){s.lim=nl;ch=1}s.vo=vt;s.io=E[1].cur;return ch}
   const pw=vt>=10;if(pw!==!!s.pw){s.pw=pw;ch=1}
   s.lim=0;s.vo=vt;s.io=E[0].cur;
   if(!txVolt(c)){const i=E[1].i||0,vm=Math.max(vt-2,0),vout=-E[1].v2;let cl=s.cl?1:0;       /* the output stage needs ~2 V headroom */
    if(pw&&i>1e-6){if(!cl&&vout>vm+.05)cl=1;
     else if(cl){const il=i-E[2].cur;if(il>1e-9&&i*(vout/il)<vm-.3)cl=0}}else cl=0;
    s.sg=i-(E[2]?E[2].cur:0);if(Math.abs((s.vm||0)-vm)>.01&&cl){s.vm=vm;ch=1}else s.vm=vm;
    if(cl!==(s.cl?1:0)){s.cl=cl;ch=1}}
   else s.cl=0;
   return ch},
  fin:c=>{const s=c.s;c.o={v:s.vo||0,i:s.io||0,p:(s.vo||0)*(s.io||0)}},
  st:c=>{const s=c.s,o=txOut(c),v=+c.p.val,volt=txVolt(c),sg=volt?o.toFixed(2)+' V':o.toFixed(2)+' mA';
   if(!s.pw)return'NO POWER';if(c.p.fault!==TXF[0])return'FAULT '+(volt?o.toFixed(1)+' V':o.toFixed(1)+' mA');
   return txV(v)+' '+c.p.unit+' → '+sg+(s.lim?'  (loop V too low)':'')+(s.cl?'  (load too high – output limited)':'')},
  msg:c=>{const r=[],p=txPct(c),n=txN(c),s=c.s;
   if(s.pw&&s.lim&&n===2)r.push(['wa',`${c.label}: less than 10 V across the transmitter – output is limited (use 24 V, mind the loop resistance)`]);
   if(s.pw&&s.cl&&!txVolt(c)){const i=txOut(c)/1e3;r.push(['wa',`${c.label}: 4-20 mA output cannot be driven – signal terminals open or load too high (max about ${Math.round((s.vm||0)/Math.max(i,1e-6))} Ω at this supply)`])}
   if(s.pw&&s.vo>36)r.push(['wa',`${c.label}: supply ${s.vo.toFixed(0)} V is above 36 V DC – a real transmitter could be damaged (use 24 V)`]);
   if(S.run&&s.pw&&c.p.fault===TXF[0]&&(p<-.01||p>100.01))r.push(['wa',`${c.label}: process value ${c.p.val} ${c.p.unit} is outside its range ${c.p.lo} … ${c.p.hi} – output saturates`]);
   if(!(+c.p.hi>+c.p.lo))r.push(['er',`${c.label}: range high must be greater than range low`]);return r},
  clk:(c,a)=>{const lo=+c.p.lo,sp=txSpan(c),cur=txPct(c);
   const pc=a==='m5'?cur-5:a==='p5'?cur+5:a==='-'?cur-1:a==='+'?cur+1:a==='--'?cur-10:a==='++'?cur+10:+a;
   if(!Number.isFinite(pc))return;const v=lo+sp*pc/100;c.p.val=Math.round(v*1e4)/1e4;S.dirty=1},
  pp:c=>{const p=txPct(c),o=txOut(c),volt=txVolt(c),n=txN(c);
   const W=n===2?'<b>Wiring (2-wire loop):</b> 24 V + → transmitter <b>+</b>, transmitter <b>−</b> → PLC AIx (4-20 mA), PLC M → 24 V −. The transmitter needs at least 10 V across it.'
    :n===3?`<b>Wiring (3-wire):</b> <b>+</b> to 24 V, <b>−</b> to 0 V (M), <b>OUT</b> to the PLC AIx (${volt?'0-10 V':'4-20 mA'}) – the PLC M must be the same 0 V.`
    :`<b>Wiring (4-wire):</b> <b>V+ / V−</b> to the 24 V supply, <b>S+</b> to the PLC AIx, <b>S−</b> to the PLC M. The ${volt?'0-10 V':'4-20 mA'} output is active (self-powered) – do not add a loop supply.`;
   return`<div class=sec>Process value</div><p style="margin:2px 0"><b>${txV(+c.p.val)} ${esc(c.p.unit)}</b> = ${p.toFixed(1)} % of span → <b>${volt?o.toFixed(2)+' V':o.toFixed(2)+' mA'}</b></p>
   <div class=row>${[0,25,50,75,100].map(q=>`<button data-clk="${q}">${q} %</button>`).join('')}</div><div class=row><button data-clk="--">− 10 %</button><button data-clk="-">− 1 %</button><button data-clk="+">+ 1 %</button><button data-clk="++">+ 10 %</button></div>
   <p class=mu>Type any value (negative too) in <i>Process value</i> above, or use the buttons; the − / + buttons on the symbol change it by 5 % while running. Changing the unit does not convert the numbers.</p>
   <p class=mu>${W} Output: ${volt?'0 V':'4 mA'} at range low, ${volt?'10 V':'20 mA'} at range high (${volt?'0 – 10.5 V':'3.8 – 20.5 mA'} while saturated). Press <b>❓ Help</b> at the top for the full explanation and wiring diagram.</p>`},
  g:c=>{const s=c.s,o=txOut(c),n=txN(c),volt=txVolt(c),wd=n===4,pc=Math.max(0,Math.min(100,txPct(c))),off=S.run&&!s.pw,
   bx=wd?[-38,20]:[-30,12],
   B=(x,a,t)=>`<rect x=${x} y=42 width=18 height=10 rx=2 data-clk="${a}" style="fill:#dbe7f0;stroke:#173d57;cursor:pointer" /><text x=${x+9} y=50 style="font:700 9px Arial;fill:#12293a;text-anchor:middle;pointer-events:none">${t}</text>`,
   lcd=off?'----':txV(+c.p.val),un=esc(String(c.p.unit).slice(0,6)),
   lb=(wd?[[-36,'V+'],[-12,'V−'],[12,'S+'],[36,'S−']]:n===3?[[-20,'+'],[20,'−'],[0,'OUT']]:[[-20,'+'],[20,'−']]).map(([x,t])=>`<text x=${x} y=-27 style="font:6.5px Arial;fill:#173d57;text-anchor:middle">${t}</text>`).join('');
   return`<rect x=${wd?-42:-32} y=-22 width=${wd?84:64} height=78 rx=5 class=s style="fill:#e8eef3" /><text y=-10 style="font:700 7.5px Arial;fill:#173d57;text-anchor:middle">${pre} · ${n}W ${volt?'0-10V':'4-20mA'}</text>`+
   `<rect x=-27 y=-4 width=54 height=16 rx=2 style="fill:#cfe6cf;stroke:#2d4d2d;stroke-width:1" /><text y=8 style="font:700 8.5px ui-monospace,Menlo,Consolas,monospace;fill:#1b351b;text-anchor:middle">${lcd} ${off?'':un}</text>`+
   `<rect x=-27 y=15 width=54 height=3.5 style="fill:#fff;stroke:#173d57;stroke-width:.7" /><rect x=-27 y=15 width=${54*pc/100} height=3.5 style="fill:${s.pw||!S.run?'#2e9e5b':'#999'}" />`+
   txGlyph(gl)+B(bx[0],'m5','−')+B(bx[1],'p5','+')+lb}}}
TXD.forEach(txMake);

/* ============ ❓ Help dialog: how the sensor works and how to wire it ============ */
const TXSN={p:'a pressure cell – a thin diaphragm with a piezo-resistive or capacitive element that bends a tiny amount under pressure',
 t:'a Pt100 / Pt1000 RTD or a thermocouple – its resistance (RTD) or millivolt output (thermocouple) changes with temperature',
 l:'a hydrostatic pressure cell at the bottom of the tank, or a radar / ultrasonic head that measures the distance to the surface',
 f:'a measuring tube (magnetic, vortex or coriolis) that produces a signal proportional to the flow',
 w:'strain-gauge load cells whose resistance changes slightly under weight',
 h:'a capacitive element whose capacitance changes with the relative humidity'};
const TXCOL={r:'#d93a3a',b:'#2f7fae',g:'#12a36b',g2:'#0b7a4a'};
/* wiring diagram: 24 V supply – transmitter – PLC analog input. n = 2, 3 or 4 wires */
function txDiag(n,volt){
 const pl=(pts,col,dash)=>`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"${dash?' stroke-dasharray="6 4"':''} />`,
  T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="4" fill="var(--pn)" stroke="var(--tx)" stroke-width="1.5" />`,
  fdot=(x,y)=>`<circle cx="${x}" cy="${y}" r="3.5" fill="var(--tx)" />`,
  box=(x,y,w,h,t,s)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1)+(s?T(x+w/2,y+h+14,s,'middle'):''),
  sig=volt?'0-10 V':'4-20 mA';
 let h=`<svg viewBox="0 0 540 250" role="img" aria-label="${n}-wire transmitter wiring diagram">`+
  box(10,40,90,130,'24 V DC supply')+T(20,74,'+24 V')+T(20,154,'0 V (−)')+dot(100,70)+dot(100,150)+
  box(440,40,90,130,'PLC')+T(450,74,'AI0')+T(450,154,'M')+T(485,112,sig==='4-20 mA'?'mA mode':'volt mode','middle')+(sig==='4-20 mA'?T(485,126,'250 Ω shunt','middle'):T(485,126,'100 kΩ input','middle'))+dot(440,70)+dot(440,150);
 if(n===2){
  h+=box(215,40,110,90,'Transmitter','2-wire')+T(228,74,'+')+T(312,74,'−','end')+dot(215,70)+dot(325,70)+
   pl('100,70 215,70',TXCOL.r)+pl('325,70 440,70',TXCOL.g)+pl('440,150 100,150',TXCOL.b)+T(382,62,'4-20 mA','middle',1)+T(270,112,'loop current I','middle')+
   T(270,170,'← current returns to 0 V through the PLC input →','middle')}
 else if(n===3){
  h+=box(215,40,110,90,'Transmitter','3-wire')+T(228,74,'+')+T(228,114,'−')+T(312,74,'OUT','end')+dot(215,70)+dot(215,110)+dot(325,70)+
   pl('100,70 215,70',TXCOL.r)+pl('100,150 440,150',TXCOL.b)+pl('215,110 180,110 180,150',TXCOL.b)+fdot(180,150)+pl('325,70 440,70',TXCOL.g)+T(382,62,sig,'middle',1)+
   T(270,168,'common 0 V: supply −, transmitter − and PLC M','middle')}
 else{
  h+=box(215,40,110,90,'Transmitter','4-wire')+T(228,74,'V+')+T(228,114,'V−')+T(312,74,'S+','end')+T(312,114,'S−','end')+dot(215,70)+dot(215,110)+dot(325,70)+dot(325,110)+
   pl('100,70 215,70',TXCOL.r)+pl('100,150 180,150 180,110 215,110',TXCOL.b)+pl('325,70 440,70',TXCOL.g)+pl('325,110 375,110 375,150 440,150',TXCOL.g2)+
   T(382,62,sig,'middle',1)+T(270,168,'supply (V+ / V−) and signal (S+ / S−) are separate','middle')}
 h+=`<g transform="translate(10,224)"><rect width="14" height="4" y="-4" fill="${TXCOL.r}" /><text x="20" y="0" style="font:11px Arial;fill:var(--tx)">+24 V</text><rect x="80" width="14" height="4" y="-4" fill="${TXCOL.b}" /><text x="100" y="0" style="font:11px Arial;fill:var(--tx)">0 V</text><rect x="150" width="14" height="4" y="-4" fill="${TXCOL.g}" /><text x="170" y="0" style="font:11px Arial;fill:var(--tx)">signal</text></g></svg>`;
 return h}

const TXSTEPS={
 2:`<ol><li>Connect the supply <b>+24 V</b> to the transmitter <b>+</b>.</li><li>Connect the transmitter <b>−</b> to the PLC analog input <b>AI0</b> (set the PLC analog inputs to <b>4-20 mA</b> in the PLC’s Properties).</li><li>Connect the PLC <b>M</b> to the supply <b>0 V (−)</b>. This closes the loop: + → transmitter → AI0 → M → 0 V.</li></ol>
  <p>The transmitter takes its power <b>from the loop itself</b>, so only two wires are needed and the same two wires carry the signal. It regulates the loop current between 4 and 20 mA. It needs at least <b>10 V across its terminals</b>, so the loop resistance must stay below (supply − 10 V) ÷ 20 mA – about <b>700 Ω at 24 V</b> (the PLC’s 250 Ω shunt plus the cable).</p>
  <p class=mu>Never connect a 2-wire transmitter straight across the supply without a load in the loop: nothing limits the current except the transmitter itself.</p>`,
 3:`<ol><li>Connect the supply <b>+24 V</b> to the transmitter <b>+</b> and the supply <b>0 V</b> to the transmitter <b>−</b>.</li><li>Connect <b>OUT</b> to the PLC analog input <b>AI0</b>. Match the PLC input mode to the <i>Output signal</i> you chose (<b>4-20 mA</b> or <b>0-10 V</b>).</li><li>Connect the PLC <b>M</b> to the same <b>0 V</b>.</li></ol>
  <p>Three cores: supply +, common 0 V, and the signal. The signal is measured <b>between OUT and the common 0 V</b>, so the supply − and the PLC M must really be the same 0 V – without it the PLC sees nothing. With a 4-20 mA output the transmitter <b>sources</b> the current out of OUT (like a PNP sensor); it can drive about (supply − 2 V) ÷ 20 mA ≈ <b>1100 Ω</b> at 24 V.</p>
  <p class=mu>A 0-10 V signal loses accuracy over long cables and a broken wire reads as 0 % – prefer 4-20 mA for long runs.</p>`,
 4:`<ol><li>Connect the 24 V supply to <b>V+</b> (+24 V) and <b>V−</b> (0 V).</li><li>Connect <b>S+</b> to the PLC analog input <b>AI0</b> and <b>S−</b> to the PLC <b>M</b>.</li><li>Match the PLC input mode to the <i>Output signal</i> (<b>4-20 mA</b> or <b>0-10 V</b>).</li></ol>
  <p>Four cores: two for the supply and two for the signal. The output stage is <b>active</b> – the transmitter creates the signal itself, so you must <b>not</b> add a loop supply in series (that is for 2-wire only). Supply and signal are electrically separate (isolated), which avoids ground loops; only S− needs to go to the PLC M. Typical for power-hungry instruments: magnetic flow meters, analysers, radar level. Real 4-wire units are often supplied with 115 / 230 V AC; here the supply is 24 V DC.</p>`};

let txDlg=null,txHc=null,txHs=2;
function txHelp(c){txHc=c;txHs=txN(c);
 if(!txDlg){txDlg=document.createElement('dialog');txDlg.id='dTXH';document.body.appendChild(txDlg);
  txDlg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
   if(b.dataset.w){txHs=+b.dataset.w;txRender()}
   else if(b.dataset.ap&&txHc){const c=txHc;c.p.wire=TXW[+b.dataset.ap-2];txWireChg(c);txDlg.close();if(S.sel&&S.sel.id===c.id)props()}
   else if('x'in b.dataset)txDlg.close()})}
 txRender();txDlg.showModal()}
function txRender(){const c=txHc,d=D[c.type],n=txHs,cur=txN(c),volt=n>2&&cur>2&&c.p.out===TXS[1],lo=+c.p.lo,sp=txSpan(c),un=esc(c.p.unit),pct=txPct(c),
 y0=txDlg.scrollTop,
 rows=[0,25,50,75,100].map(q=>`<tr><td>${txV(lo+sp*q/100)} ${un}</td><td>${q} %</td><td>${(4+q*.16).toFixed(1)} mA</td><td>${(q/10).toFixed(1)} V</td></tr>`).join(''),
 sn=TXSN[d.sn]||'a measuring element (probe, electrode or cell) that suits the quantity',
 tabs=TXW.map((w,i)=>`<button data-w=${i+2} class="${i+2===n?'pri':''}">${w}${i+2===cur?' ✓':''}</button>`).join('');
 txDlg.innerHTML=`<h2>${esc(d.n)} – how it works &amp; how to wire it</h2>
 <h4>1. What a transmitter does</h4>
 <p>A transmitter converts a physical quantity into a <b>standard electrical signal</b> that a PLC or controller can read over long cables. Inside there are three parts:</p>
 <ol><li><b>Sensing element</b> – ${sn}.</li><li><b>Electronics</b> – amplify, linearise and scale the weak sensor signal to the calibrated range (<i>range low … range high</i>).</li><li><b>Output stage</b> – produces <b>4-20 mA</b> (or <b>0-10 V</b>) in proportion to the measurement.</li></ol>
 <p>4 mA means “range low” and 20 mA means “range high”. The 4 mA <i>live zero</i> lets the PLC tell a real 0 % from a broken wire (0 mA), and a current signal is not affected by cable length or noise. Below 3.6 mA or above 21 mA is a <b>fault</b> signal (NAMUR NE 43).</p>
 <p><b>Scaling for this transmitter</b> (range ${txV(lo)} … ${txV(+c.p.hi)} ${un}): <code>mA = 4 + 16 × (value − low) ÷ (high − low)</code>, <code>V = 10 × (value − low) ÷ (high − low)</code>. Now: <b>${txV(+c.p.val)} ${un}</b> = ${pct.toFixed(1)} % → <b>${(4+Math.max(-.0,Math.min(100,pct))*.16).toFixed(2)} mA</b> / <b>${(Math.max(0,Math.min(100,pct))/10).toFixed(2)} V</b>.</p>
 <table><tr><th>Process value</th><th>% of span</th><th>4-20 mA</th><th>0-10 V</th></tr>${rows}</table>
 <h4>2. 2-wire, 3-wire or 4-wire – which one?</h4>
 <p>Choose it in Properties → <i>Transmitter type (wires)</i>, or press the button below to use the type you are looking at. The terminals on the symbol change with the type.</p>
 <table><tr><th></th><th>2-wire</th><th>3-wire</th><th>4-wire</th></tr>
 <tr><td>Power</td><td>From the signal loop (10 – 30 V)</td><td>Own supply: + and common 0 V</td><td>Own supply: V+ / V−</td></tr>
 <tr><td>Signal</td><td>4-20 mA only</td><td>4-20 mA or 0-10 V</td><td>4-20 mA or 0-10 V, isolated</td></tr>
 <tr><td>Cable cores</td><td>2</td><td>3</td><td>4</td></tr>
 <tr><td>Return path</td><td>Same two wires</td><td>Common 0 V shared with the supply</td><td>Own S− wire</td></tr>
 <tr><td>Typical use</td><td>Most field instruments: pressure, temperature, level</td><td>Analysers, vibration, speed, simple sensors</td><td>Flow meters, analysers, anything needing more power</td></tr></table>
 <h4>3. Wiring diagram</h4>
 <div class=tabs>${tabs}</div>
 ${txDiag(n,volt)}
 ${TXSTEPS[n]}
 ${n!==cur?`<p><button class=pri data-ap=${n}>Use ${TXW[n-2]} for this transmitter</button></p>`:`<p class=mu>✓ This is the wiring type currently selected for ${esc(c.label)}.</p>`}
 <h4>4. In this simulator</h4>
 <ul><li>Enter the <b>process value</b> in Properties, with the 0-100 % buttons, or with the − / + buttons on the symbol (±5 % while running). The simulator has no real process – you play the process.</li>
 <li>Press <b>▶ Run</b>. The display shows the value and, in the status line, the signal that leaves the transmitter.</li>
 <li>Out-of-range values <b>saturate</b> at 3.8 – 20.5 mA (0 – 10.5 V). <i>Simulate sensor fault</i> forces burnout low (3.6 mA / 0 V) or high (21 mA / 10.5 V) so you can test the PLC’s wire-break and fault alarms.</li>
 <li>Changing the wiring type removes wires that were on terminals the new type does not have. A supply above 36 V gives a warning.</li></ul>
 <h4>5. Troubleshooting</h4>
 <table><tr><th>You see</th><th>Check</th></tr>
 <tr><td>Status “NO POWER”</td><td>Supply not connected, polarity reversed, or the loop is not closed back to 0 V. 2-wire needs the loop to return through the PLC input; 3- / 4-wire need at least 10 V on the supply terminals.</td></tr>
 <tr><td>“Loop V too low” (2-wire)</td><td>Less than 10 V across the transmitter. Use 24 V and keep the loop resistance below about 700 Ω.</td></tr>
 <tr><td>PLC input stays at 0 %</td><td>PLC M is not on the same 0 V, or the PLC input mode (mA / V) does not match the transmitter’s <i>Output signal</i>.</td></tr>
 <tr><td>“Load too high / output limited” (3- / 4-wire, mA)</td><td>The signal terminals are open, or the load is above about 1100 Ω at 24 V. Wire OUT / S+ to the PLC input.</td></tr>
 <tr><td>PLC reports a wire break (&lt; 3.6 mA)</td><td>A 4-20 mA loop is open, or <i>Simulate sensor fault</i> is set to burnout low.</td></tr></table>
 <div class=act><button class=pri data-x>Close</button></div>`;
 txDlg.scrollTop=y0}

