/* ElectroSim v8.4 – compressed air (pneumatics). Loaded after valves.js.
   cda  CDA source: clean dry compressed air at a set pressure (one air port).
   svp  Solenoid valve panel (valves.js): P air in → A1…An air out, each valve opens when its coil is energised.
   pav  Air-operated valve, SINGLE acting (spring return): one AIR port + OPEN / CLOSED limit switches (dry contacts).
   pad  Air-operated valve, DOUBLE acting: ports A (opens) and B (closes) + OPEN / CLOSED limit switches.
   Air ports are terminals whose flag contains "a". They connect ONLY to other air ports, with an "air line"
   (drawn blue with small tick marks, animated while pressurised). The air network is solved separately from the electrical
   network: airSolve() is called by step() (solver.js) after the electrical solve, because valve states come from the coils.
   Part hooks:  air:(c,A)  declare   A.src(term,bar)  a pressure source  ·  A.edge(from,to)  an open passage from → to
                airFin:(c,get)  read the pressure get(term) that arrived at each terminal after the solve. */
'use strict';
const AIRC={on:'#0b7fd1',off:'#9bbfdc'};                       /* air line colour: pressurised / no pressure */
const isAirT=(c,i)=>{const t=dd(c).t[i];return!!(t&&t[3]&&t[3].includes('a'))};
const airK=k=>{const[id,i]=String(k).split('.'),c=by(+id);return!!c&&isAirT(c,+i)};
const airBar=k=>S.run&&S.air?S.air[k]||0:0;

function airSolve(){
 const cs=S.comps,P={},find=k=>{if(!(k in P))P[k]=k;return P[k]===k?k:(P[k]=find(P[k]))};
 cs.forEach(c=>dd(c).t.forEach((t,i)=>{if(isAirT(c,i))find(c.id+'.'+i)}));
 S.wires.forEach(w=>{if(airK(w.a)&&airK(w.b))P[find(w.a)]=find(w.b)});
 const src=[],edges=[];
 cs.forEach(c=>{const d=D[c.type];if(d.air)d.air(c,{src:(i,b)=>src.push([find(c.id+'.'+i),b]),edge:(i,j)=>edges.push([find(c.id+'.'+i),find(c.id+'.'+j)])})});
 const pr={};src.forEach(([n,b])=>{pr[n]=Math.max(pr[n]||0,b)});
 for(let it=0,ch=1;ch&&it<60;it++){ch=0;edges.forEach(([a,b])=>{const v=pr[a]||0;if(v>(pr[b]||0)+1e-9){pr[b]=v;ch=1}})}   /* air only flows forward through an open valve */
 S.air={};
 cs.forEach(c=>{dd(c).t.forEach((t,i)=>{if(isAirT(c,i))S.air[c.id+'.'+i]=pr[find(c.id+'.'+i)]||0});const d=D[c.type];if(d.airFin)d.airFin(c,i=>S.air[c.id+'.'+i]||0)})}

/* air line markup (used by draw.js pageMarkup): coloured line + small tick marks, animated dashes while pressurised */
function airWire(w,d,live,sel){
 const b=airBar(w.a),on=live&&b>.05,col=w.col||(on?AIRC.on:AIRC.off),wd=w.wd||2.5;
 return`<path d="${d}" class="wire air${sel?' sel':''}" style="${sel?'':'stroke:'+col+';'}stroke-width:${wd}" /><path d="${d}" class=amk style="stroke:${sel?'var(--ac)':col}" />`+
  (on&&!sel?`<path d="${d}" class=afl />`:'')+(live?`<path d="${d}" class=hit data-w=${w.id} />`:'')}

/* ================= CDA source ================= */
const CDS=['On','Off'];
D.cda={n:'CDA source (clean dry air)',ds:'Compressed dry air (CDA) source with one air outlet and a set pressure',cat:'Valves & Actuators',pre:'CDA',
 t:[[0,-40,'AIR OUT','an']],bb:[-28,-46,56,100],
 p:{P:[6,'bar','Supply pressure'],sup:[CDS[0],'','Air supply',CDS]},
 icon:`<path d="M0 -22V-12" style="stroke:#0b7fd1;stroke-width:3;fill:none" /><circle r=16 class=s style="fill:#e8f4fd" /><path d="M-6 6L0 -8L6 6Z" class=s style="fill:#fff" /><text y=15 class=mt style="font-size:7px;font-weight:700">CDA</text>`,
 el:()=>[RR(0,0,1e9)],fin:c=>{c.o={v:0,i:0,p:0}},
 air:(c,A)=>{if(c.p.sup===CDS[0])A.src(0,+c.p.P||0)},
 airFin:(c,g)=>{c.s.pout=g(0)},
 pn:c=>c.p.sup===CDS[0]?`air ${(+c.p.P).toFixed(1)} bar`:'air OFF',
 st:c=>c.p.sup===CDS[0]?'AIR ON · '+(+c.p.P).toFixed(1)+' bar':'AIR OFF',
 msg:c=>S.run&&c.p.sup!==CDS[0]?[['wa',`${c.label}: air supply is OFF – nothing downstream can move`]]:[],
 clk:(c,a)=>{if(!S.run)return;c.p.sup=c.p.sup===CDS[0]?CDS[1]:CDS[0];S.dirty=1},
 help:c=>pnHelp('cda',c),
 pp:c=>`<p class=mu style="margin:6px 0">${S.run?`<b style="color:${c.p.sup===CDS[0]?AIRC.on:VLC.shut}">${c.p.sup===CDS[0]?'AIR ON – '+(+c.p.P).toFixed(1)+' bar':'AIR OFF'}</b>`:'Press ▶ Run, then click the source to switch the air on / off.'}</p>
  <p class=mu><b>Wiring:</b> draw an <b>air line</b> from <b>AIR OUT</b> to <b>P (air in)</b> of a solenoid valve panel. Air ports connect only to air ports. One source can feed several panels – wire them to the same port.</p>`,
 g:c=>{const run=!!S.run,on=c.p.sup===CDS[0],ac=run&&on?AIRC.on:AIRC.off;
  return`<path d="M0 -40V-20" style="stroke:${ac};stroke-width:3;fill:none" /><g data-clk=t style="cursor:pointer"><circle r=20 class=s style="fill:${on?'#e8f4fd':'#eceff2'}" /><path d="M-7 4L0 -12L7 4Z" class=s style="fill:#fff" /><text y=16 class=tx style="font-size:9px">CDA</text></g>`+
   `<text y=38 style="font:700 8px Arial;text-anchor:middle;fill:${on?'#0b6fb8':VLC.shut}">${on?(+c.p.P).toFixed(1)+' bar':'AIR OFF'}</text><text x=8 y=-30 style="${vlLbl};text-anchor:start">AIR</text>`}};

/* ================= Air-operated valves with limit switches ================= */
const LST=['NO – closes at end of travel','NC – opens at end of travel'];
const MODS=['On / Off (air only)','Modulating 0-10 V','Modulating 4-20 mA'];       /* control mode: air on/off, or a positioner following an analogue signal */
const pnMode=c=>MODS.includes(c.p.mode)?c.p.mode:MODS[0];
const pnMod=c=>pnMode(c)!==MODS[0];
const pnSg=c=>c.type==='pad'?6:5;                                                   /* index of the SIG + terminal */
const pnPos=c=>{const s=c.s;return typeof s.pos==='number'?s.pos:(c.type==='pav'&&c.p.spr===VAS[1])||(c.type==='pad'&&c.p.ini===VAI[1])?1:0};
const pnTxt=c=>{const p=pnPos(c),s=c.s;if(p>=.995)return'OPEN';if(p<=.005)return'CLOSED';if(typeof s.tg==='number'&&Math.abs(s.tg-p)<.002)return'AT '+Math.round(p*100)+' %';return(s.dir>0?'OPENING ':'CLOSING ')+Math.round(p*100)+' %'};
const pnLs=c=>{const p=pnPos(c);return[p>=.995,p<=.005]};                           /* [open limit made, closed limit made] */
const pnOk=(b,c)=>b>0&&b>=(+c.p.pmin||0);                                           /* enough pressure to move the piston */
function pnTick(c){const s=c.s,p=c.p,st=Math.max(.1,+p.T||3),pos=pnPos(c);let tg=pos;
 if(pnMod(c)){if(pnOk(s.pa||0,c))tg=(s.sig||0)/100;else if(c.type==='pav')tg=p.spr===VAS[1]?1:0}   /* positioner: follows the signal while air is available; no air → spring (single) / hold (double) */
 else if(c.type==='pav'){const dr=pnOk(s.pa||0,c);tg=p.spr===VAS[1]?(dr?0:1):(dr?1:0)}
 else{const a=pnOk(s.pa||0,c),b=pnOk(s.pb||0,c);if(a&&!b)tg=1;else if(b&&!a)tg=0}      /* no spring: holds position unless one side wins */
 s.tg=tg;const r=DT/st;s.pos=Math.abs(tg-pos)<=r?tg:pos+Math.sign(tg-pos)*r;s.dir=Math.sign(tg-pos)||s.dir||1}
const pnLsBox=(y0,lbl,on)=>`<rect x=46 y=${y0} width=32 height=40 rx=4 style="fill:#fff;stroke:#173d57;stroke-width:1.8" /><text x=62 y=${y0+16} style="font:700 10px Arial;fill:#173d57;text-anchor:middle">${lbl}</text><circle cx=62 cy=${y0+29} r=6 style="fill:${on?VLC.open:'#fff'};stroke:#173d57;stroke-width:1.4" />`;
function pnBody(c,dbl){
 const run=!!S.run,s=c.s,p=pnPos(c),col=run?vlCol(p):VLC.off,w=34,[lo,lc]=run?pnLs(c):[0,0],ac=b=>run&&b>0?AIRC.on:AIRC.off;
 let h=`<path d="M-40 36H-16M16 36H40" class=s /><path d="M0 8V26" class=s /><path d="M34 -10H46M40 -10V30H46" class=s style="stroke-width:1.2;stroke-dasharray:2 2" />`+
  `<rect x=${-w} y=-22 width=${2*w} height=30 rx=9 style="fill:${run?col:'#e8eef3'};stroke:#173d57;stroke-width:1.8" />`+
  `<path d="M-16 26L0 36-16 46ZM16 26L0 36 16 46Z" style="fill:${col};stroke:#173d57;stroke-width:1.5;stroke-linejoin:round" />${run&&p<=.005?`<path d="M0 26V46" style="stroke:#173d57;stroke-width:2.5" />`:''}`+
  pnLsBox(-30,'ZSO',lo)+pnLsBox(12,'ZSC',lc);
 if(pnMod(c)){const u=pnMode(c)===MODS[1]?'0-10 V':'4-20 mA',sg=run&&!s.brk?Math.round(s.sig||0)+' %':run?'BREAK':'';
  h+=`<rect x=-72 y=-28 width=24 height=36 rx=3 style="fill:#fff;stroke:#173d57;stroke-width:1.5" /><text x=-60 y=-17 style="font:700 7px Arial;fill:#173d57;text-anchor:middle">SIG</text><text x=-60 y=-9 style="font:700 5.5px Arial;fill:#6b7f92;text-anchor:middle">${u}</text><text x=-60 y=3 style="font:700 7px Arial;fill:${s.brk?VLC.shut:'#0b6fb8'};text-anchor:middle">${sg}</text>`+
   `<text x=-88 y=-17 style="${vlLbl};text-anchor:end">+</text><text x=-88 y=3 style="${vlLbl};text-anchor:end">−</text>`}
 if(dbl&&pnMod(c))h+=`<path d="M-20 -60V-22" style="stroke:${ac(s.pa)};stroke-width:3;fill:none" /><text x=-28 y=-56 style="${vlLbl};text-anchor:end">AIR</text>`;
 else if(dbl)h+=`<path d="M-20 -60V-22" style="stroke:${ac(s.pa)};stroke-width:3;fill:none" /><path d="M20 -60V-22" style="stroke:${ac(s.pb)};stroke-width:3;fill:none" /><text x=-28 y=-56 style="${vlLbl};text-anchor:end">A · open</text><text x=28 y=-56 style="${vlLbl};text-anchor:start">B · close</text>`;
 else h+=`<path d="M0 -60V-22" style="stroke:${ac(s.pa)};stroke-width:3;fill:none" /><text x=8 y=-56 style="${vlLbl};text-anchor:start">AIR</text>`;
 const tx=run?pnTxt(c):'';
 h+=`<text y=${dbl?-3:-3} style="font:700 ${run?(tx.length>7?7:9):7}px Arial;text-anchor:middle;fill:${run?'#fff':'#173d57'}">${run?tx:(dbl?'DOUBLE ACTING':'SPRING RETURN')}</text>`;
 const air=run?(dbl?`A ${(s.pa||0).toFixed(1)} · B ${(s.pb||0).toFixed(1)} bar`:((s.pa||0)>0?`air ${s.pa.toFixed(1)} bar`:'NO AIR')):'';
 return h+`<text y=60 style="font:700 8px Arial;text-anchor:middle;fill:${run?((s.pa||0)>0||(s.pb||0)>0?'#0b6fb8':VLC.shut):'#6b7f92'}">${air}</text>`+
  `<text x=76 y=-33 style="${vlLbl}">LIMIT SW</text><text x=88 y=-17 style="${vlLbl};text-anchor:start">1</text><text x=88 y=3 style="${vlLbl};text-anchor:start">2</text><text x=88 y=23 style="${vlLbl};text-anchor:start">1</text><text x=88 y=43 style="${vlLbl};text-anchor:start">2</text>`}
const pnCommon={cat:'Valves & Actuators',pre:'XV',sx:44,sy:22,sc0:.8,
 t:[[80,-20,'ZSO 1 (open limit)','o'],[80,0,'ZSO 2 (open limit)','o'],[80,20,'ZSC 1 (closed limit)','o'],[80,40,'ZSC 2 (closed limit)','o']],
 tk:pnTick,fin:c=>{const s=c.s,e=c.e;c.o={v:e?e.v2:0,i:e?e.cur:0,p:0}},
 sim:(c,E)=>{const s=c.s;if(S.time===0){s.pos=undefined;s.tg=undefined}
  if(pnMod(c)&&E[2]){const e=E[2];s.brk=0;let pct;if(pnMode(c)===MODS[1]){s.sv=e.v2;pct=e.v2/10*100}else{const mA=e.cur*1e3;s.sm=mA;s.brk=mA<3.6?1:0;pct=(mA-4)/16*100}s.sig=Math.max(0,Math.min(100,pct))}else s.sig=s.brk=0;
  return 0},
 chg:(c,k)=>{if(k==='mode'){vlPrune(c);return true}return false},
 el:c=>{const[o,k]=pnLs(c),nc=c.p.ls===LST[1],r=v=>(nc?!v:v)?.005:1e9,e=[RR(0,1,r(o)),RR(2,3,r(k))];if(pnMod(c))e.push(RR(pnSg(c),pnSg(c)+1,pnMode(c)===MODS[1]?1e5:250));return e},    /* analogue input: 100 kΩ (0-10 V) or 250 Ω shunt (4-20 mA) */
 dyn:c=>pnMod(c)?pnDef(c.type):D[c.type],
 msgMod:c=>{const s=c.s,r=[];if(!S.run||!pnMod(c))return r;
  if(pnMode(c)===MODS[1]){if(s.sv>10.5||s.sv<-.5)r.push(['wa',`${c.label}: signal ${s.sv.toFixed(1)} V is outside 0-10 V`])}
  else{if(s.brk)r.push(['wa',`${c.label}: 4-20 mA signal lost (${(s.sm||0).toFixed(1)} mA < 3.6 mA) – wire break or no signal, valve driven to 0 %`]);else if(s.sm>21)r.push(['wa',`${c.label}: signal ${s.sm.toFixed(1)} mA is above 20 mA`])}
  return r},
 pn:c=>{const s=c.s;return c.type==='pad'?`air A ${(s.pa||0).toFixed(1)} · B ${(s.pb||0).toFixed(1)} bar`:`air ${(s.pa||0).toFixed(1)} bar`}};

D.pav=Object.assign({},pnCommon,{n:'Air-operated valve – single acting + limit switches',ds:'Pneumatic actuated valve, single acting spring return, air port AIR, OPEN (ZSO) and CLOSED (ZSC) limit switches',
 t:[...pnCommon.t,[0,-60,'AIR','an'],[-80,-20,'SIG + (control signal)','oh'],[-80,0,'SIG − (signal return)','oh']],bb:[-92,-66,184,132],
 p:{mode:[MODS[0],'','Control mode',MODS],spr:[VAS[0],'','Spring action',VAS],T:[3,'s','Stroke time'],pmin:[3,'bar','Min. air pressure to move'],ls:[LST[0],'','Limit switch contacts',LST]},
 icon:`<rect x=-24 y=-14 width=36 height=16 rx=5 class=s style="fill:#e8eef3" /><path d="M-9 8L0 14-9 20ZM9 8L0 14 9 20Z" class=s style="fill:#fff" /><path d="M0 -14V-24" style="stroke:#0b7fd1;stroke-width:3;fill:none" /><rect x=18 y=-14 width=10 height=24 rx=2 class=s style="fill:#fff" />`,
 air:()=>{},airFin:(c,g)=>{c.s.pa=g(4)},help:c=>pnHelp('pav',c),
 st:c=>pnTxt(c)+(c.s.pa>0?' · air '+c.s.pa.toFixed(1)+' bar':' · NO AIR'),
msg:c=>{const r=D.pav.msgMod(c),s=c.s;if(S.run&&s.pa>0&&!pnOk(s.pa,c))r.push(['wa',`${c.label}: air ${s.pa.toFixed(1)} bar is below the minimum ${c.p.pmin} bar – the spring wins`]);return r},
 pp:c=>pnPp(c,0),
 g:c=>pnBody(c,0)});

D.pad=Object.assign({},pnCommon,{n:'Air-operated valve – double acting + limit switches',ds:'Pneumatic actuated valve, double acting (no spring), air ports A (open) and B (close), OPEN (ZSO) and CLOSED (ZSC) limit switches',
 t:[...pnCommon.t,[-20,-60,'A (air to open)','an'],[20,-60,'B (air to close)','an'],[-80,-20,'SIG + (control signal)','oh'],[-80,0,'SIG − (signal return)','oh']],bb:[-92,-66,184,132],
 p:{mode:[MODS[0],'','Control mode',MODS],ini:[VAI[0],'','Position at start',VAI],T:[3,'s','Stroke time'],pmin:[3,'bar','Min. air pressure to move'],ls:[LST[0],'','Limit switch contacts',LST]},
 icon:`<rect x=-24 y=-14 width=36 height=16 rx=5 class=s style="fill:#e8eef3" /><path d="M-9 8L0 14-9 20ZM9 8L0 14 9 20Z" class=s style="fill:#fff" /><path d="M-10 -14V-24M2 -14V-24" style="stroke:#0b7fd1;stroke-width:3;fill:none" /><rect x=18 y=-14 width=10 height=24 rx=2 class=s style="fill:#fff" />`,
 air:()=>{},airFin:(c,g)=>{c.s.pa=g(4);c.s.pb=g(5)},help:c=>pnHelp('pad',c),
 st:c=>pnTxt(c)+(c.s.pa>0||c.s.pb>0?` · A ${(c.s.pa||0).toFixed(1)} / B ${(c.s.pb||0).toFixed(1)} bar`:' · NO AIR'),
msg:c=>{const r=D.pav.msgMod(c),s=c.s;if(S.run){if(!pnMod(c)&&s.pa>0&&s.pb>0&&pnOk(s.pa,c)&&pnOk(s.pb,c))r.push(['wa',`${c.label}: air on BOTH ports – the piston is balanced and the valve stays where it is (interlock the two valves)`]);
  else if((s.pa>0&&!pnOk(s.pa,c))||(s.pb>0&&!pnOk(s.pb,c)))r.push(['wa',`${c.label}: air pressure is below the minimum ${c.p.pmin} bar – the valve cannot move`])}return r},
 pp:c=>pnPp(c,1),
 g:c=>pnBody(c,1)});

function pnPp(c,dbl){const s=c.s,run=S.run,p=pnPos(c),[lo,lc]=pnLs(c),nc=c.p.ls===LST[1],fo=c.p.spr===VAS[1];
 const ls=(on,n)=>`<b style="color:${on?VLC.open:'#6b7f92'}">${n}: ${(nc?!on:on)?'contact CLOSED':'contact open'}</b>`;
 return`<div class=sec>Valve</div><p style="margin:2px 0">${run?`<b style="color:${vlCol(p)}">${esc(pnTxt(c))}</b> · ${dbl?`air A ${(s.pa||0).toFixed(1)} bar · B ${(s.pb||0).toFixed(1)} bar`:((s.pa||0)>0?`air ${s.pa.toFixed(1)} bar`:'<b style="color:'+VLC.shut+'">no air</b>')}<br>${ls(lo,'ZSO (open limit)')}<br>${ls(lc,'ZSC (closed limit)')}`:'Press ▶ Run to see the valve move.'}</p>
 ${pnMod(c)?`<p class=mu><b>${pnMode(c)}:</b> wire the control signal to <b>SIG +</b> / <b>SIG −</b> (left side) from a PLC analogue output or a signal injector. The valve goes to the position that matches the signal: ${pnMode(c)===MODS[1]?'0 V = closed, 10 V = open':'4 mA = closed, 20 mA = open (below 3.6 mA = wire break → 0 %)'}. ${run?`Signal now: <b>${pnMode(c)===MODS[1]?(s.sv||0).toFixed(2)+' V':(s.sm||0).toFixed(2)+' mA'}</b> → setpoint <b>${Math.round(s.sig||0)} %</b>.`:''} Air on the supply port (${dbl?'A':'AIR'}) is only the power to move the piston; with no air a single-acting valve goes to its spring position, a double-acting one holds.</p>`:''}
 <p class=mu><b>Air:</b> ${dbl?'air on <b>A</b> opens the valve, air on <b>B</b> closes it. With no air the valve stays where it is (no spring).':`air on <b>AIR</b> ${fo?'CLOSES':'OPENS'} the valve against the spring; with no air the spring returns it ${fo?'OPEN':'CLOSED'} (fail-safe).`} Needs at least ${c.p.pmin} bar and ${c.p.T} s to travel.</p>
 <p class=mu><b>Limit switches (feedback):</b> <b>ZSO</b> (terminals 1-2 at the right) ${nc?'opens':'closes'} when the valve is fully OPEN; <b>ZSC</b> ${nc?'opens':'closes'} when it is fully CLOSED. They are dry contacts: put 24 V through one to a PLC input (e.g. I0.0 = open, I0.1 = closed) or a lamp. During travel both are ${nc?'closed':'open'}.</p>`}

const pnDefs={};
function pnDef(k){return pnDefs[k]||(pnDefs[k]=Object.assign(Object.create(D[k]),{t:D[k].t.map((q,i)=>{const sg=k==='pad'?6:5;return i===sg||i===sg+1?[q[0],q[1],q[2],'o']:(k==='pad'&&i===5?[q[0],q[1],q[2],'anh']:q)})}))}

/* ================= Help dialog (air path, wiring diagram) ================= */
let pnDlg=null;
function pnDiag(k){
 const AL=(pts)=>`<polyline points="${pts}" fill="none" stroke="${AIRC.on}" stroke-width="3" stroke-linejoin="round" /><polyline points="${pts}" fill="none" stroke="${AIRC.on}" stroke-width="9" stroke-dasharray="2 20" />`,
  EL=(pts,c)=>`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round" />`,
  T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y,c)=>`<circle cx="${x}" cy="${y}" r="4" fill="var(--pn)" stroke="${c||'var(--tx)'}" stroke-width="1.5" />`,
  box=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1),
  R='#d93a3a',B='#2f7fae',G='#12a36b',dbl=k==='pad';
 let h=`<svg viewBox="0 0 600 300" role="img" aria-label="air and wiring diagram">`+
  box(10,120,100,70,'CDA source')+T(60,160,'6 bar','middle')+dot(110,150,AIRC.on)+
  box(210,70,140,170,'Solenoid valve panel')+dot(210,150,AIRC.on)+T(218,154,'P')+dot(350,150,AIRC.on)+T(326,154,'A1','end')+dot(250,70,R)+T(250,92,'Y1','middle')+dot(330,70,B)+T(330,92,'COM','middle')+
  box(450,110,140,110,dbl?'Double acting':'Single acting')+(dbl?dot(450,140,AIRC.on)+T(458,144,'A')+dot(450,170,AIRC.on)+T(458,174,'B'):dot(450,150,AIRC.on)+T(458,154,'AIR'))+
  dot(500,220,G)+dot(530,220,G)+T(500,210,'ZSO','middle')+T(530,210,'ZSC','middle')+
  AL('110,150 210,150')+(dbl?AL('350,150 400,150 400,140 450,140')+AL('350,196 420,196 420,170 450,170')+dot(350,196,AIRC.on)+T(326,200,'A2','end'):AL('350,150 450,150'))+
  EL('250,70 250,30 120,30',R)+T(10,34,'+24 V via switch / PLC Q0.0')+EL('330,70 330,30 360,30 360,10 10,10',B)+T(10,6,'0 V')+
  EL('500,220 500,262 120,262',G)+EL('530,220 530,280 120,280',G)+T(10,266,'to PLC input I0.0')+T(10,284,'to PLC input I0.1')+
  `<g transform="translate(300,262)"><polyline points="0,0 28,0" fill="none" stroke="${AIRC.on}" stroke-width="3" /><polyline points="0,0 28,0" fill="none" stroke="${AIRC.on}" stroke-width="9" stroke-dasharray="2 20" /><text x="36" y="4" style="font:11px Arial;fill:var(--tx)">air line</text></g>`+`</svg>`;
 return h}
const PNH={
 cda:{t:'CDA source',w:`<h4>1. What it is</h4><p><b>CDA</b> is <i>clean dry air</i>: the compressed-air supply of the plant (compressor, dryer and receiver). In the simulator it is a source with one <b>AIR OUT</b> port and a set <b>pressure</b>.</p>
  <h4>2. How to use it</h4><ol><li>Draw an <b>air line</b> (blue, with small tick marks) from <b>AIR OUT</b> to <b>P (air in)</b> of the solenoid valve panel. Tap one air port, then the other.</li><li>Press <b>▶ Run</b>. The line turns bright blue and its dashes move when air is present.</li><li>Click the source while running (or set <i>Air supply = Off</i>) to switch the air off and watch the actuator return to its spring position.</li></ol>
  <h4>3. Rules</h4><ul><li>Air ports connect only to air ports – the simulator refuses a wire between an air port and an electrical terminal.</li><li>Air only passes a solenoid valve while that valve is <b>open</b>. A closed valve vents the line behind it (0 bar).</li><li>One source can feed several panels: wire them all to the same AIR OUT port.</li></ul>`},
 pav:{t:'Air-operated valve – single acting with limit switches',w:`<h4>1. What it is</h4><p>A process valve turned by a spring-return pneumatic actuator. Air on the <b>AIR</b> port pushes the piston against the spring; with no air the spring returns the valve to its <b>fail-safe</b> position. A <b>limit switch box</b> on the actuator gives electrical feedback: <b>ZSO</b> is made when the valve is fully open, <b>ZSC</b> when it is fully closed.</p>
  <h4>2. How to connect it</h4><ol><li><b>CDA source → P</b> of the panel, <b>A1 → AIR</b> of the valve (two air lines).</li><li><b>+24 V → switch / PLC output → Y1</b>, <b>COM → 0 V</b> on the panel.</li><li>Feedback: wire <b>+24 V</b> to terminal 1 of <b>ZSO</b>, and terminal 2 to a lamp or PLC input. Do the same with <b>ZSC</b> for the closed position.</li><li>Press <b>▶ Run</b> and close the switch: the coil energises, air flows A1 → AIR, the valve travels (amber) and <b>ZSO</b> lights when it arrives.</li></ol>
  <h4>3. In this simulator</h4><ul><li><i>Spring action</i> – fail closed (air opens) or fail open (air closes).</li><li><i>Min. air pressure to move</i> – below it the spring wins and a warning is shown.</li><li><i>Limit switch contacts</i> – NO (closes at the end of travel) or NC (opens at the end of travel). Both are open / closed in between.</li></ul>`},
 pad:{t:'Air-operated valve – double acting with limit switches',w:`<h4>1. What it is</h4><p>A double-acting actuator has air on both sides of the piston and <b>no spring</b>. Air on port <b>A</b> opens the valve, air on port <b>B</b> closes it. With no air it stays where it is. <b>ZSO</b> / <b>ZSC</b> are the open / closed limit switches.</p>
  <h4>2. How to connect it</h4><ol><li>Use <b>two valves of the panel</b>: <b>A1 → A</b> (open) and <b>A2 → B</b> (close). Air in the panel comes from the CDA source on <b>P</b>.</li><li>Energise <b>Y1</b> to open, <b>Y2</b> to close. Never both at once.</li><li>Wire the limit switches to a lamp or PLC inputs as for the single-acting valve.</li></ol>
  <h4>3. In this simulator</h4><ul><li><i>Position at start</i> – open or closed when you press Run.</li><li>A pulse shorter than the stroke time moves the valve only part-way, and it stays there.</li><li>Air on both ports balances the piston – a warning is shown.</li></ul>`}};
const PNMOD=`<h4>Control mode (Properties)</h4><ul><li><b>On / Off (air only)</b> – the valve is fully open or fully closed, decided by the air on its port(s).</li><li><b>Modulating 0-10 V</b> or <b>4-20 mA</b> – a positioner is added: two terminals <b>SIG +</b> / <b>SIG −</b> appear on the left. The valve moves to the position given by the signal (0 V or 4 mA = closed, 10 V or 20 mA = open), anywhere between. The input is 100 kΩ for volts and a 250 Ω shunt for mA, so it works with the PLC analogue outputs (AO) and the signal injector. A 4-20 mA signal below 3.6 mA is treated as a wire break (valve to 0 %).</li><li>The air port is then the positioner's <b>supply</b>: it needs the minimum pressure to move. On a double-acting valve only port A is used for supply.</li><li>ZSO / ZSC limit switches still work at the ends of travel.</li></ul>`;
PNH.pav.w+=PNMOD;PNH.pad.w+=PNMOD;
function pnHelp(k,c){const H=PNH[k];
 if(!pnDlg){pnDlg=document.createElement('dialog');pnDlg.id='dVLH';pnDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))pnDlg.close()});document.body.appendChild(pnDlg)}
 pnDlg.id='dVLH';pnDlg.innerHTML=`<h2>${H.t} – how it works &amp; how to wire it</h2>${k==='cda'?'':pnDiag(k)}${H.w}
  <h4>Troubleshooting</h4><table><tr><th>You see</th><th>Check</th></tr><tr><td>Air line stays pale</td><td>The CDA source is Off, or the solenoid valve in between is closed (coil not energised, wrong COM, or voltage below 70 %).</td></tr><tr><td>“terminal(s) not connected”</td><td>The air port <b>P</b> / <b>AIR</b> needs an air line. Unused outlets <b>A</b> and the limit switch terminals can stay open.</td></tr><tr><td>Valve does not move</td><td>Pressure is below <i>Min. air pressure to move</i>, or – double acting – air is on both ports.</td></tr></table>
  <div class=act><button class=pri data-x>Close</button></div>`;pnDlg.showModal()}

/* extend the panel help (valves.js) with the air connection */
VLH.svp.w+=`<h4>4. Air connection</h4><p>The panel also has an <b>air inlet P</b> and one <b>air outlet A1 … An</b> per valve. Draw an <b>air line</b> (tap one air port, then another) from the <b>CDA source</b> to <b>P</b>, and from <b>A1</b> to the actuator. When the coil of Y1 is energised its valve opens and air flows from P to A1; when it is de-energised the outlet is vented and the actuator spring returns the valve.</p>`;

/* ================= Mechanical pressure switches – STAND-ALONE (no air line needed) =================
   v8.15: the switch no longer has an AIR IN port. You apply the test pressure yourself: use the  −  /  +  buttons on the symbol
   (0.5 bar per click), the buttons in Properties, or type a value in "Pressure applied". The contacts follow that pressure.
   Terminals: 0 COM · 1 NC · 2 NO.  Contact at rest: COM–NC closed.  ACTUATED: COM–NO closed, COM–NC open.
   pws  SINGLE set point: ACTUATED when the pressure rises to the set point, returns at set point − differential.
   pwd  TWO set points (ON point / OFF point), two actions:
        Pump       – ACTUATED when the pressure falls to the ON point, released when it rises to the OFF point, holds in between
                     (compressor / pump cut-in – cut-out).
        Window     – ACTUATED from the ON point up to (not including) the OFF point, released below and above. */
const pwPv=c=>{const v=parseFloat(c.p.pv);return Number.isFinite(v)?v:0};
const pwRng=c=>Math.max(.1,+c.p.rng||10);
const pwWin=c=>String(c.p.mo||'').startsWith('Window');
/* trigger / release pressures: single → set point / set point − differential;  two-point → ON point / OFF point */
const pwPts=(c,two)=>two?{on:+c.p.pon||0,off:+c.p.poff||0}:{on:+c.p.sp||0,off:Math.max(0,(+c.p.sp||0)-(+c.p.df||0))};
function pwEval(c,two){const s=c.s,v=pwPv(c),P=pwPts(c,two);
 if(!two){if(v>=P.on)s.act=1;else if(v<=P.off)s.act=0}
 else if(pwWin(c))s.act=(v>=P.on&&v<P.off)?1:0;
 else{if(v<=P.on)s.act=1;else if(v>=P.off)s.act=0}}
function pwMake(two){
 const lbl=two?'Pressure Switch – mechanical, 2 set points':'Pressure Switch – mechanical, 1 set point';
 return{n:lbl,ds:two?'Stand-alone mechanical pressure switch with two set points (ON point and OFF point): set the pressure by hand, no air line needed. Changeover contact COM / NC / NO'
   :'Stand-alone mechanical pressure switch with one set point and a differential: set the pressure by hand, no air line needed. Changeover contact COM / NC / NO',cat:'Valves & Actuators',pre:'BP',anyNum:1,
 t:[[-40,20,'COM (common)'],[40,10,'NC (closed at rest, opens when actuated)','o'],[40,30,'NO (open at rest, closes when actuated)','o']],bb:[-46,-54,92,118],
 p:two?{pv:[0,'bar','Pressure applied (use − / + on the symbol)'],pon:[2,'bar','ON point (low)'],poff:[5,'bar','OFF point (high)'],mo:['Pump (ON falling to low, OFF rising to high)','','Action',['Pump (ON falling to low, OFF rising to high)','Window (ON between low and high)']],rng:[10,'bar','Range maximum (end of the scale)']}
      :{pv:[0,'bar','Pressure applied (use − / + on the symbol)'],sp:[4,'bar','Set point (contacts change when the pressure rises to this)'],df:[.8,'bar','Differential (contacts return at set point − differential)'],rng:[10,'bar','Range maximum (end of the scale)']},
 el:c=>[RR(0,1,c.s.act?1e9:.005),RR(0,2,c.s.act?.005:1e9)],
 sim:c=>{const prev=!!c.s.act;if(S.time===0)c.s.act=0;pwEval(c,two);return prev!==!!c.s.act},
 clk:(c,a)=>{const P=pwPts(c,two),cur=pwPv(c),
   v=a==='-'?cur-.5:a==='+'?cur+.5:a==='--'?cur-1:a==='++'?cur+1:a==='z'?0:a==='max'?pwRng(c):a==='on'?P.on:a==='off'?P.off:NaN;
  if(!Number.isFinite(v))return;c.p.pv=Math.round(Math.max(0,v)*1e3)/1e3;S.dirty=1},
 st:c=>S.run?(c.s.act?'ACTUATED – NO closed, NC open':'RESET – NC closed, NO open'):'',
 pn:c=>`${pwPv(c).toFixed(1)} bar`,
 msg:c=>{const r=[],v=pwPv(c);
  if(S.run&&v>1.25*pwRng(c))r.push(['wa',`${c.label}: pressure ${v.toFixed(1)} bar is above the range maximum of ${c.p.rng} bar – the bellows can be damaged`]);
  if(two){if(!(+c.p.poff>+c.p.pon))r.push(['er',`${c.label}: the OFF point (${c.p.poff} bar) must be higher than the ON point (${c.p.pon} bar)`]);
   if(Math.max(+c.p.pon,+c.p.poff)>+c.p.rng)r.push(['wa',`${c.label}: a set point is above the range maximum ${c.p.rng} bar`])}
  else if(+c.p.sp>+c.p.rng)r.push(['wa',`${c.label}: set point ${c.p.sp} bar is above the range maximum ${c.p.rng} bar`]);return r},
 pp:c=>{const P=pwPts(c,two),v=pwPv(c),win=pwWin(c),act=!!c.s.act;
  const rule=!two?`Contacts <b>actuate</b> when the pressure rises to <b>${P.on.toFixed(2)} bar</b> and <b>return</b> when it falls to <b>${P.off.toFixed(2)} bar</b>.`
   :win?`<b>Window:</b> contacts are <b>actuated</b> from <b>${P.on.toFixed(2)} bar</b> up to (not including) <b>${P.off.toFixed(2)} bar</b>, and at rest below and above that band.`
   :`<b>Pump:</b> contacts <b>actuate</b> when the pressure falls to <b>${P.on.toFixed(2)} bar</b> (ON) and <b>return</b> when it rises to <b>${P.off.toFixed(2)} bar</b> (OFF); between the two they keep their last state.`;
  return`<div class=sec>Manual pressure</div><p style="margin:2px 0"><b>${v.toFixed(2)} bar</b> – ${S.run?`contacts <b style="color:${act?'var(--ok)':'inherit'}">${act?'ACTUATED (COM–NO closed, COM–NC open)':'at rest (COM–NC closed, COM–NO open)'}</b>`:'press ▶ Run to see the contacts'}</p>
   <div class=row><button data-clk="z">0 bar</button><button data-clk="on">${two?'→ ON point':'→ Trigger'}</button><button data-clk="off">${two?'→ OFF point':'→ Reset'}</button><button data-clk="max">Max</button></div>
   <div class=row><button data-clk="--">− 1 bar</button><button data-clk="-">− 0.5</button><button data-clk="+">+ 0.5</button><button data-clk="++">+ 1 bar</button></div>
   <p class=mu>${rule}</p>
   <p class=mu>No air line is needed – the pressure is whatever you set here (or with the − / + buttons on the symbol). <b>Wiring:</b> use <b>COM</b> with <b>NO</b> or <b>NC</b> in the control circuit, for example NO to a lamp or PLC input for “pressure OK”, NC for a low-pressure alarm.</p>`},
 g:c=>{const run=!!S.run,s=c.s,rng=pwRng(c),pv=Math.min(rng*1.2,Math.max(0,pwPv(c))),act=run&&!!s.act,
   ang=v=>-120+240*Math.min(1,Math.max(0,v/rng)),pt=(a,r)=>[(r*Math.sin(a*Math.PI/180)).toFixed(1),(-r*Math.cos(a*Math.PI/180)).toFixed(1)],
   arc=(a0,a1,r)=>{const p0=pt(a0,r),p1=pt(a1,r);return`M${p0[0]} ${p0[1]}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${p1[0]} ${p1[1]}`},
   P=pwPts(c,two),mk=(v,col)=>{const a=pt(ang(v),12),b=pt(ang(v),17.5);return`<path d="M${a[0]} ${-26+ +a[1]}L${b[0]} ${-26+ +b[1]}" style="stroke:${col};stroke-width:2.2" />`},
   na=pt(ang(pv),12);let ticks='';
  for(let i=0;i<=5;i++){const a=-120+48*i,q0=pt(a,13.5),q1=pt(a,16);ticks+=`<path d="M${q0[0]} ${q0[1]}L${q1[0]} ${q1[1]}" style="stroke:#6b7f92;stroke-width:.8" />`}
  const L=act?[14,30]:[14,10],
   B=(x,a,t)=>`<rect x=${x} y=46 width=17 height=10 rx=2 data-clk="${a}" style="fill:#dbe7f0;stroke:#173d57;cursor:pointer" /><text x=${x+8.5} y=54 style="font:700 9px Arial;fill:#12293a;text-anchor:middle;pointer-events:none">${t}</text>`;
  return`<rect x=-22 y=-48 width=44 height=106 rx=5 class=s style="fill:#eef2f6" /><circle cy=-26 r=19 class=s style="fill:#fff" />`+
   `<g transform="translate(0 -26)"><path d="${arc(-120,120,15)}" style="fill:none;stroke:#cfd8e0;stroke-width:2" />${ticks}</g>`+
   (two?mk(P.on,'var(--ok)')+mk(P.off,'var(--er)'):mk(P.on,'var(--er)'))+
   `<g transform="translate(0 -26)"><path d="M0 0L${na[0]} ${na[1]}" style="stroke:${act?'#0b7fd1':'#173d57'};stroke-width:1.6;stroke-linecap:round" /><circle r=2 style="fill:#173d57" /></g>`+
   `<text y=-1 style="font:700 5.5px Arial;text-anchor:middle;fill:${act?'#0b6fb8':'#173d57'}">${pwPv(c).toFixed(1)} bar</text>`+
   `<path d="M-22 20H-14M14 10H22M14 30H22" class=s /><circle cx=-14 cy=20 r=2 class=f /><circle cx=14 cy=10 r=2 style="fill:#fff;stroke:#173d57;stroke-width:1.2" /><circle cx=14 cy=30 r=2 style="fill:#fff;stroke:#173d57;stroke-width:1.2" />`+
   `<path d="M-14 20L${L[0]-2} ${L[1]}" class=s style="stroke:${act?'var(--ok)':'#173d57'}" /><text x=-13 y=34 style="${vlLbl};font-size:5px;text-anchor:start">C</text><text x=19 y=8 style="${vlLbl};font-size:5px;text-anchor:end">NC</text><text x=19 y=38 style="${vlLbl};font-size:5px;text-anchor:end">NO</text>`+
   B(-19,'-','−')+B(2,'+','+')}}}
D.pws=pwMake(0);D.pwd=pwMake(1);
