/* ElectroSim v8 – valves & actuators (library group "Valves & Actuators").
   svp  Solenoid valve panel: a terminal block (COM + Y1…Yn) with 1-8 solenoid valves. A valve opens (normally closed) or closes (normally open) when its coil is energised.
   vsa  Pneumatic actuated valve, SINGLE acting: one solenoid pilot (3/2) – energised = air on the piston, de-energised = spring returns the valve.
   vda  Pneumatic actuated valve, DOUBLE acting: two solenoid pilots (5/2, OPEN and CLOSE coils, one common). No spring – it holds its last position.
   The valve position is shown on the symbol (green OPEN / red CLOSED / amber while travelling), in the results table and in Properties.
   Loaded after transmitters.js. Uses RR, D, S, DT, esc, dd (registry / draw), commit / props / toast (app). */
'use strict';
const VLC={open:'#2e9e5b',shut:'#d93a3a',mov:'#e6a317',off:'#ffffff'};
const vlCol=p=>p>=.995?VLC.open:p<=.005?VLC.shut:VLC.mov;
const vlEn=(prev,v,V)=>prev?Math.abs(v)>=.3*V:Math.abs(v)>=.7*V;          /* coil pulls in at 70 % of rated voltage, drops out at 30 % */
const vlPrune=c=>{const t=dd(c).t,bad=k=>{const[id,i]=String(k).split('.');return +id===c.id&&(!t[+i]||hidT(t[+i]))},n0=S.wires.length;
 S.wires=S.wires.filter(w=>!(bad(w.a)||bad(w.b)));const n=n0-S.wires.length;if(n)toast(n+' wire'+(n>1?'s':'')+' on removed terminals deleted');S.dirty=1};
const vlCoil=c=>c.p.V*c.p.V/Math.max(c.p.P,.01);
const vlLbl='font:700 7px Arial;fill:#173d57;text-anchor:middle';

/* ================= Solenoid valve panel ================= */
/* Terminals (index is fixed, so saved projects and wires survive a change of "Number of valves"):
     0 COM · 1…8 Y1…Y8 (coils, electrical) · 9 P (air in, one per panel) · 10…17 A1…A8 (air out, one per valve).
   Slots beyond the chosen number of valves are hidden. The air side is solved in pneumatic.js (airSolve). */
const SVA=['Normally closed (opens when ON)','Normally open (closes when ON)'];
const svN=c=>Math.max(1,Math.min(8,Math.round(+c.p.n)||4));
const svX=(n,i)=>(i-n/2)*40;                      /* i = 0 is the common terminal, 1…n are the valves */
const svLay={};
function svT(n){const t=[[svX(n,0),-60,'COM']];
 for(let i=0;i<8;i++)t.push(i<n?[svX(n,i+1),-60,'Y'+(i+1),'o']:[0,-60,'Y'+(i+1),'oh']);
 t.push([svX(n,0),100,'P (air in)','an']);
 for(let i=0;i<8;i++)t.push(i<n?[svX(n,i+1),100,'A'+(i+1)+' (air out)','aon']:[0,100,'A'+(i+1),'aoh']);return t}
function svDef(n){return svLay[n]||(svLay[n]=Object.assign(Object.create(D.svp),{t:svT(n),bb:[svX(n,0)-26,-66,40*n+52,196]}))}
const svOpen=(c,i)=>{const s=c.s,mo=(s.mo||[])[i]||0,e=!!(s.e&&s.e[i]),nc=c.p.act===SVA[0];return mo===1?1:mo===2?0:((nc?e:!e)?1:0)};
D.svp={n:'Solenoid valve panel (terminal block + air ports)',ds:'Solenoid valve panel / valve island: COM + Y1…Y8 coil terminals, air inlet P and one air outlet A1…A8 per valve',cat:'Valves & Actuators',pre:'YV',t:[],sy:22,vs:1,
 p:{n:[4,'','Number of valves (1-8)',['1','2','3','4','5','6','7','8']],V:[24,'V','Coil voltage'],P:[3,'W','Power per coil'],act:[SVA[0],'','Valve action',SVA]},
 dyn:c=>svDef(svN(c)),help:c=>vlHelp('svp',c),
 icon:`<rect x=-30 y=-18 width=60 height=36 rx=3 class=s style="fill:#e8eef3" /><path d="M-18 -18V-26M-6 -18V-26M6 -18V-26M18 -18V-26" class=s /><path d="M-18 -4H18M-18 -4V6M-6 -4V6M6 -4V6M18 -4V6" style="stroke:#0b7fd1;stroke-width:2;fill:none" /><path d="M-18 6V26M-6 6V26M6 6V26M18 6V26" style="stroke:#0b7fd1;stroke-width:2;fill:none" /><text y=14 class=mt style="font-size:8px">SOV</text>`,
 chg:(c,k)=>{if(k==='n'){vlPrune(c);return true}return k==='act'},
 el:c=>Array.from({length:svN(c)},(_,i)=>RR(i+1,0,vlCoil(c))),
 /* air: the valve passes air from P (terminal 9) to its outlet A (terminal 10+i) while it is open; a closed valve vents its outlet */
 air:(c,A)=>{const n=svN(c);for(let i=0;i<n;i++)if(svOpen(c,i))A.edge(9,10+i)},
 airFin:(c,g)=>{const n=svN(c);c.s.pin=g(9);c.s.po=[];for(let i=0;i<n;i++)c.s.po[i]=g(10+i)},
 sim:(c,E)=>{const s=c.s,n=svN(c);if(S.time===0)s.e=[];s.e=s.e||[];let vm=0,im=0,pw=0;
  for(let i=0;i<n;i++){const v=E[i].v2;s.e[i]=vlEn(s.e[i],v,c.p.V)?1:0;vm=Math.max(vm,Math.abs(v));im+=Math.abs(E[i].cur);pw+=v*E[i].cur}
  s.vm2=vm;s.im2=im;s.pw2=Math.abs(pw);return 0},
 fin:c=>{const s=c.s;c.o={v:s.vm2||0,i:s.im2||0,p:s.pw2||0}},
 st:c=>{const n=svN(c),o=[];for(let i=0;i<n;i++)if(svOpen(c,i))o.push('Y'+(i+1));return(o.length?'OPEN: '+o.join(' '):'ALL CLOSED')+(c.s.pin>0?' · air '+c.s.pin.toFixed(1)+' bar':' · no air')},
 msg:c=>{const r=[],s=c.s,n=svN(c);if(S.run&&s.vm2>1.15*c.p.V)r.push(['wa',`${c.label}: overvoltage ${s.vm2.toFixed(1)} V on a coil (rated ${c.p.V} V)`]);
  (s.mo||[]).forEach((m,i)=>{if(m&&i<n)r.push(['wa',`${c.label}: Y${i+1} manual override is ON (${m===1?'forced open':'forced closed'})`])});
  if(S.run&&!(s.pin>0)){const on=[];for(let i=0;i<n;i++)if(svOpen(c,i))on.push('Y'+(i+1));if(on.length)r.push(['wa',`${c.label}: ${on.join(', ')} open but there is no air at inlet P – check that the CDA source is On and an air line joins it to P`])}return r},
 clk:(c,a)=>{const i=parseInt(String(a).slice(1))-1;if(!(i>=0&&i<svN(c)))return;c.s.mo=c.s.mo||[];c.s.mo[i]=((c.s.mo[i]||0)+1)%3;S.dirty=1},
 pp:c=>{const n=svN(c),run=S.run,L=['Auto','Forced open','Forced closed'];let r='';
  for(let i=0;i<n;i++){const o=svOpen(c,i),e=c.s.e&&c.s.e[i],m=(c.s.mo||[])[i]||0,pa=c.s.po&&c.s.po[i];
   r+=`<tr><td><b>Y${i+1}</b></td><td>${run?(e?'ON':'off'):'–'}</td><td>${run?`<b style="color:${o?VLC.open:VLC.shut}">${o?'OPEN':'CLOSED'}</b>`:'–'}</td><td>${run?(pa>0?`<b style="color:#0b7fd1">${pa.toFixed(1)} bar</b>`:'0'):'–'}</td><td><button data-clk="m${i+1}" title="Manual override: Auto → forced open → forced closed">${L[m]}</button></td></tr>`}
  return`<div class=sec>Valves</div><table class=iomap><tr><th></th><th>Coil</th><th>Valve</th><th>Air out</th><th>Override</th></tr>${r}</table>
  <p class=mu><b>Electrical:</b> connect <b>COM</b> to 0 V. Put ${c.p.V} V on <b>Y1 … Y${n}</b> (a switch, a relay contact or a PLC output) and that valve ${c.p.act===SVA[0]?'opens':'closes'}. A coil pulls in at 70 % of its rated voltage.</p>
  <p class=mu><b>Air:</b> draw an <b>air line</b> from the CDA source to <b>P (air in)</b>, and from <b>A1 … A${n} (air out)</b> to the actuator. Air reaches an outlet only while its valve is open. Click a valve on the symbol (or the Override button) to force it by hand. Press <b>❓ Help</b> for the full explanation.</p>`},
 g:c=>{const n=svN(c),s=c.s,run=!!S.run,x0=svX(n,0),xe=svX(n,n),ac=v=>run&&v>0?AIRC.on:AIRC.off,pin=run?(s.pin||0):0;
  let h=`<rect x=${x0-22} y=-22 width=${40*n+44} height=106 rx=5 class=s style="fill:#e8eef3" /><text x=${x0} y=-11 style="${vlLbl}">COM</text>`;
  /* manifold: P → bus → every valve inlet */
  h+=`<path d="M${x0} 100V16H${xe}" style="fill:none;stroke:${ac(pin)};stroke-width:3;stroke-linejoin:round" /><text x=${x0+7} y=78 style="font:700 7px Arial;fill:#0b6fb8">P · IN</text>`;
  for(let i=0;i<n;i++){const x=svX(n,i+1),o=run&&svOpen(c,i),e=run&&s.e&&s.e[i],mo=(s.mo||[])[i]||0,col=run?(o?VLC.open:VLC.shut):VLC.off,po=run&&s.po?s.po[i]||0:0;
   h+=`<text x=${x} y=-11 style="${vlLbl}">Y${i+1}</text><circle cx=${x} cy=1 r=4 style="fill:${e?VLC.open:'#fff'};stroke:#173d57;stroke-width:1" />`+
    `<circle cx=${x} cy=16 r=2.6 style="fill:${ac(pin)}" /><path d="M${x} 16V22" style="stroke:${ac(pin)};stroke-width:3;fill:none" /><path d="M${x} 46V100" style="stroke:${ac(po)};stroke-width:3;fill:none" />`+
    `<g data-clk="m${i+1}" style="cursor:pointer"><rect x=${x-14} y=20 width=28 height=30 rx=3 style="fill:transparent" /><path d="M${x-8} 22H${x+8}L${x} 34ZM${x-8} 46H${x+8}L${x} 34Z" style="fill:${col};stroke:#173d57;stroke-width:1.2;stroke-linejoin:round" />${run&&!o?`<path d="M${x-9} 34H${x+9}" style="stroke:#173d57;stroke-width:2" />`:''}</g>`+
    `<text x=${x+6} y=62 style="font:700 6.5px Arial;fill:${run?(o?VLC.open:VLC.shut):'#6b7f92'}">${run?(o?'OPEN':'CLOSED'):'–'}</text><text x=${x+6} y=78 style="font:700 7px Arial;fill:#0b6fb8">A${i+1}</text>${run&&mo?`<text x=${x+11} y=4 style="font:700 6px Arial;fill:${VLC.mov};text-anchor:middle">M</text>`:''}`}
  return h}};

/* ================= Pneumatic actuated valves ================= */
const VAS=['Fail closed (air opens, spring closes)','Fail open (air closes, spring opens)'],VAA=['On (air supply available)','Off (air supply failed)'],VAI=['Closed','Open'];
const vlPos=c=>{const s=c.s;return typeof s.pos==='number'?s.pos:(c.type==='vsa'&&c.p.spr===VAS[1])||(c.type==='vda'&&c.p.ini===VAI[1])?1:0};
const vlTxt=c=>{const p=vlPos(c),s=c.s;return p>=.995?'OPEN':p<=.005?'CLOSED':(s.dir>0?'OPENING ':'CLOSING ')+Math.round(p*100)+' %'};
const vlAir=c=>c.p.air===VAA[0];
/* actuator + valve body. coils = [[x,y,label,on], …] pilot solenoids drawn beside the actuator */
function vlBody(c,wide,pilots,labels){
 const run=!!S.run,p=vlPos(c),col=run?vlCol(p):VLC.off,w=wide?34:26,tx=run?vlTxt(c):'',pil=pilots.map(([x,l,on])=>`<rect x=${x} y=-18 width=14 height=18 rx=2 style="fill:${on?VLC.open:'#fff'};stroke:#173d57;stroke-width:1.2" /><text x=${x+7} y=-6 style="font:700 7px Arial;fill:#173d57;text-anchor:middle">${l}</text><path d="M${x<0?x+14:x} -9H${x<0?-w:w}" class=s style="stroke-width:1.2;stroke-dasharray:2 2" />`).join('');
 return`<path d="M-50 36H-16M16 36H50" class=s /><path d="M0 8V26" class=s />`+
  `<rect x=${-w} y=-22 width=${2*w} height=30 rx=9 style="fill:${run?col:'#e8eef3'};stroke:#173d57;stroke-width:1.8" />`+pil+
  `<path d="M-16 26L0 36-16 46ZM16 26L0 36 16 46Z" style="fill:${col};stroke:#173d57;stroke-width:1.5;stroke-linejoin:round" />${run&&p<=.005?`<path d="M0 26V46" style="stroke:#173d57;stroke-width:2.5" />`:''}`+
  `<text y=${labels?3:-3} style="font:700 ${tx.length>7?7:9}px Arial;text-anchor:middle;fill:${run?'#fff':'#173d57'}">${run?tx:(wide?'DOUBLE ACTING':'SINGLE ACTING')}</text>`+
  `<text y=60 style="font:700 8px Arial;text-anchor:middle;fill:${run?(vlAir(c)?'#6b7f92':VLC.shut):'#6b7f92'}">${run?(vlAir(c)?'valve '+Math.round(p*100)+' %':'NO AIR'):''}</text>`}
const vlTick=c=>{const s=c.s,p=c.p,st=Math.max(.1,+p.T||3),pos=vlPos(c),air=vlAir(c);let tg=pos;
 if(c.type==='vsa'){const dr=!!s.en&&air;tg=p.spr===VAS[1]?(dr?0:1):(dr?1:0)}
 else{if(air&&s.ea&&!s.eb)tg=1;else if(air&&s.eb&&!s.ea)tg=0}
 const r=DT/st;s.pos=Math.abs(tg-pos)<=r?tg:pos+Math.sign(tg-pos)*r;s.dir=Math.sign(tg-pos)||s.dir||1};
const vlCommon={cat:'Valves & Actuators',pre:'XV',sy:22,
 tk:vlTick,
 fin:c=>{const s=c.s;c.o={v:s.vm2||0,i:s.im2||0,p:s.pw2||0}},
 st:c=>{const s=c.s;return vlTxt(c)+(vlAir(c)?'':'  · NO AIR')}};

D.vsa=Object.assign({},vlCommon,{n:'Actuated valve – single acting (spring return)',ds:'Pneumatic actuated valve, single acting / spring return with solenoid pilot: open / closed indication',
 t:[[-12,-52,'A1'],[12,-52,'A2']],bb:[-56,-58,112,128],
 p:{V:[24,'V','Coil voltage'],P:[3,'W','Coil power'],spr:[VAS[0],'','Spring action',VAS],T:[3,'s','Stroke time'],air:[VAA[0],'','Air supply',VAA]},
 help:c=>vlHelp('vsa',c),
 el:c=>[RR(0,1,vlCoil(c))],
 sim:(c,E)=>{const s=c.s;if(S.time===0)s.pos=undefined;const v=E[0].v2;s.en=vlEn(s.en,v,c.p.V)?1:0;s.vm2=Math.abs(v);s.im2=Math.abs(E[0].cur);s.pw2=Math.abs(v*E[0].cur);return 0},
 msg:c=>{const r=[],s=c.s;if(S.run){if(s.vm2>1.15*c.p.V)r.push(['wa',`${c.label}: overvoltage ${s.vm2.toFixed(1)} V on the coil (rated ${c.p.V} V)`]);
  if(!vlAir(c))r.push(['wa',`${c.label}: air supply is OFF – the spring holds the valve ${c.p.spr===VAS[1]?'open':'closed'}`])}return r},
 pp:c=>{const s=c.s,run=S.run,p=vlPos(c),fo=c.p.spr===VAS[1];
  return`<div class=sec>Valve</div><p style="margin:2px 0">${run?`<b style="color:${vlCol(p)}">${esc(vlTxt(c))}</b> · coil ${s.en?'ON':'off'}${vlAir(c)?'':' · <b style="color:'+VLC.shut+'">no air</b>'}`:'Press ▶ Run to see the valve move.'}</p>
  <p class=mu><b>Wiring:</b> connect the coil <b>A1</b> to the control voltage (${c.p.V} V – from a switch, relay contact or PLC output) and <b>A2</b> to 0 V. Coil ${fo?'ON → valve CLOSES (air pushes the piston against the spring)':'ON → valve OPENS (air pushes the piston against the spring)'}; coil OFF → the spring returns the valve to ${fo?'OPEN':'CLOSED'}, also when the air or the power fails (fail-safe). It travels in ${c.p.T} s. Press <b>❓ Help</b> for details.</p>`},
 g:c=>vlBody(c,0,[[30,'Y',!!(S.run&&c.s.en)]],0)+`<text x=-12 y=-27 style="${vlLbl}">A1</text><text x=12 y=-27 style="${vlLbl}">A2</text>`});

D.vda=Object.assign({},vlCommon,{n:'Actuated valve – double acting (2 solenoids)',ds:'Pneumatic actuated valve, double acting with 5/2 double solenoid pilot (OPEN and CLOSE coils): open / closed indication',
 t:[[-24,-52,'OPEN'],[0,-52,'CLOSE'],[24,-52,'COM']],bb:[-62,-58,124,128],
 p:{V:[24,'V','Coil voltage'],P:[3,'W','Power per coil'],ini:[VAI[0],'','Position at start',VAI],T:[3,'s','Stroke time'],air:[VAA[0],'','Air supply',VAA]},
 help:c=>vlHelp('vda',c),
 el:c=>[RR(0,2,vlCoil(c)),RR(1,2,vlCoil(c))],
 sim:(c,E)=>{const s=c.s;if(S.time===0)s.pos=undefined;const a=E[0].v2,b=E[1].v2;s.ea=vlEn(s.ea,a,c.p.V)?1:0;s.eb=vlEn(s.eb,b,c.p.V)?1:0;
  s.vm2=Math.max(Math.abs(a),Math.abs(b));s.im2=Math.abs(E[0].cur)+Math.abs(E[1].cur);s.pw2=Math.abs(a*E[0].cur)+Math.abs(b*E[1].cur);return 0},
 msg:c=>{const r=[],s=c.s;if(S.run){if(s.vm2>1.15*c.p.V)r.push(['wa',`${c.label}: overvoltage ${s.vm2.toFixed(1)} V on a coil (rated ${c.p.V} V)`]);
  if(s.ea&&s.eb)r.push(['wa',`${c.label}: OPEN and CLOSE coils are both energised – the valve stays where it is (interlock them)`]);
  if(!vlAir(c)&&(s.ea||s.eb))r.push(['wa',`${c.label}: air supply is OFF – the valve cannot move (a double-acting actuator has no spring)`])}return r},
 pp:c=>{const s=c.s,run=S.run,p=vlPos(c);
  return`<div class=sec>Valve</div><p style="margin:2px 0">${run?`<b style="color:${vlCol(p)}">${esc(vlTxt(c))}</b> · OPEN coil ${s.ea?'ON':'off'} · CLOSE coil ${s.eb?'ON':'off'}${vlAir(c)?'':' · <b style="color:'+VLC.shut+'">no air</b>'}`:'Press ▶ Run to see the valve move.'}</p>
  <p class=mu><b>Wiring:</b> <b>COM</b> to 0 V. ${c.p.V} V on <b>OPEN</b> → the valve opens; ${c.p.V} V on <b>CLOSE</b> → it closes. With both coils off it <b>stays in its last position</b> (no spring; a 5/2 double-solenoid valve remembers), so a short pulse is enough. Never energise both together. Travel time ${c.p.T} s. Press <b>❓ Help</b> for details.</p>`},
 g:c=>vlBody(c,1,[[-48,'Y1',!!(S.run&&c.s.ea)],[34,'Y2',!!(S.run&&c.s.eb)]],1)+`<text x=-24 y=-27 style="${vlLbl}">OPEN</text><text x=0 y=-27 style="${vlLbl}">CLOSE</text><text x=24 y=-27 style="${vlLbl}">COM</text>`});

/* ================= Help dialog ================= */
function vlDiag(kind){
 const pl=(pts,col)=>`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" />`,
  T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="4" fill="var(--pn)" stroke="var(--tx)" stroke-width="1.5" />`,
  box=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1),
  sw=(x,y,t)=>`<rect x="${x}" y="${y}" width="80" height="26" rx="5" fill="var(--pn)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+40,y+17,t,'middle'),
  two=kind==='vda',n1=kind==='svp'?'Y1':kind==='vsa'?'A1':'OPEN',n2=kind==='svp'?'COM':kind==='vsa'?'A2':'CLOSE',R='#d93a3a',B='#2f7fae',G='#12a36b';
 let h=`<svg viewBox="0 0 540 250" role="img" aria-label="wiring diagram">`+box(10,40,90,150,'24 V DC supply')+T(20,74,'+24 V')+T(20,174,'0 V (−)')+dot(100,70)+dot(100,170);
 h+=box(430,40,100,150,kind==='svp'?'Valve panel':kind==='vsa'?'Single acting':'Double acting');
 if(kind==='vda'){
  h+=sw(190,57,'Switch / Q0.0 – open')+sw(190,107,'Switch / Q0.1 – close')+T(440,74,'OPEN')+T(440,124,'CLOSE')+T(440,174,'COM')+dot(430,70)+dot(430,120)+dot(430,170)+
   pl('100,70 190,70',R)+pl('150,70 150,120 190,120',R)+pl('270,70 430,70',G)+pl('270,120 430,120',G)+pl('430,170 100,170',B)}
 else{
  h+=sw(190,57,'Switch / PLC Q0.0')+T(440,74,n1)+T(440,174,n2)+dot(430,70)+dot(430,170)+pl('100,70 190,70',R)+pl('270,70 430,70',G)+pl('430,170 100,170',B)}
 h+=`<g transform="translate(10,228)"><rect width="14" height="4" y="-4" fill="${R}" /><text x="20" y="0" style="font:11px Arial;fill:var(--tx)">+24 V</text><rect x="80" width="14" height="4" y="-4" fill="${B}" /><text x="100" y="0" style="font:11px Arial;fill:var(--tx)">0 V</text><rect x="150" width="14" height="4" y="-4" fill="${G}" /><text x="170" y="0" style="font:11px Arial;fill:var(--tx)">switched +24 V to the coil</text></g></svg>`;
 return h}
const VLH={
 svp:{t:'Solenoid valve panel',w:`<h4>1. What it is</h4><p>A solenoid valve panel (valve island) carries up to eight small solenoid valves on one base. All coils are wired to one <b>terminal block</b>: a shared <b>COM</b> terminal (0 V) and one terminal <b>Y1 … Yn</b> per valve. Each valve controls one air or fluid line.</p>
  <p>A valve is “normally closed” (NC) when it is shut with the coil off and opens when the coil is energised. A “normally open” (NO) valve is the opposite. Choose it in Properties → <i>Valve action</i>.</p>
  <h4>2. How to connect it</h4><ol><li>Connect <b>COM</b> to the supply <b>0 V</b>.</li><li>Feed <b>+24 V</b> through a switch, a relay contact or a PLC output (for example <b>Q0.0</b>) to the terminal of the valve you want, e.g. <b>Y1</b>.</li><li>Press <b>▶ Run</b> and close the switch: the coil of that valve is energised and the symbol turns <b style="color:${VLC.open}">green – OPEN</b>. Open the switch and it returns to <b style="color:${VLC.shut}">red – CLOSED</b>.</li></ol>
  <p>Every valve works on its own: <b>Y2</b> does nothing while only <b>Y1</b> has voltage. Unused <b>Y</b> terminals can stay unconnected. Change <i>Number of valves</i> to add or remove terminals.</p>
  <h4>3. In this simulator</h4><ul><li>A coil pulls in at 70 % of its rated voltage and drops out below 30 %. A 12 V signal on a 24 V coil does nothing.</li><li>Each coil draws power ÷ voltage (3 W at 24 V = 125 mA). Size the supply and the PLC relay output for all coils together.</li><li><b>Manual override:</b> click a valve on the symbol (or the button in Properties) to force it open or closed, then once more to return to Auto. A warning reminds you while an override is active.</li><li>The results table lists which valves are open.</li></ul>`},
 vsa:{t:'Actuated valve – single acting',w:`<h4>1. What it is</h4><p>A process valve (ball, butterfly) moved by a <b>pneumatic actuator</b>. A <b>single-acting</b> actuator has air on one side of the piston and a <b>spring</b> on the other. A small <b>3/2 solenoid pilot valve</b> sends the air.</p>
  <ul><li><b>Coil energised</b> → air pushes the piston against the spring → the valve moves to its <i>air</i> position.</li><li><b>Coil off</b> (or the air or power fails) → the spring pushes it back → the valve goes to its <b>fail-safe</b> position.</li></ul>
  <p>Choose the fail-safe direction in Properties → <i>Spring action</i>: <b>fail closed</b> (air opens; used for fuel, steam, chemicals) or <b>fail open</b> (air closes; used for cooling water).</p>
  <h4>2. How to connect it</h4><ol><li>Connect <b>A2</b> to <b>0 V</b>.</li><li>Feed <b>+24 V</b> through a switch or PLC output to <b>A1</b>.</li><li>Run: with voltage on A1 the actuator and valve body change colour as it travels (<b style="color:${VLC.mov}">amber</b>, with the percentage) and settle on <b style="color:${VLC.open}">green – OPEN</b> or <b style="color:${VLC.shut}">red – CLOSED</b>.</li></ol>
  <p>The coil must stay energised to keep the valve in its air position – you need a continuous output.</p>
  <h4>3. In this simulator</h4><ul><li><i>Stroke time</i> is how long the full travel takes.</li><li><i>Air supply = Off</i> simulates an air failure: the valve goes to its fail-safe position even if the coil is on.</li><li>Coil pull-in is 70 % of the rated voltage. The pilot is drawn as a small box with <b>Y</b>; it turns green when energised.</li></ul>`},
 vda:{t:'Actuated valve – double acting',w:`<h4>1. What it is</h4><p>A <b>double-acting</b> actuator has air on <b>both</b> sides of the piston and <b>no spring</b>. A <b>5/2 double-solenoid pilot valve</b> has two coils: <b>OPEN</b> sends air to open the valve, <b>CLOSE</b> sends air to close it.</p>
  <p>This pilot valve <b>remembers</b>: after a short pulse on a coil it stays in that position even when the voltage is removed, so the valve stays open or closed. It only moves when the other coil is energised.</p>
  <h4>2. How to connect it</h4><ol><li>Connect <b>COM</b> to <b>0 V</b>.</li><li>Feed <b>+24 V</b> through one switch or PLC output to <b>OPEN</b> and through a second one to <b>CLOSE</b>.</li><li>Run: energise OPEN – the valve travels (amber) to <b style="color:${VLC.open}">green – OPEN</b>. Remove the voltage – it stays open. Energise CLOSE – it travels to <b style="color:${VLC.shut}">red – CLOSED</b>.</li></ol>
  <p><b>Never</b> energise both coils at once – the simulator warns and the valve keeps its position. In a real panel the two outputs are interlocked.</p>
  <h4>3. In this simulator</h4><ul><li><i>Position at start</i> sets whether the valve is open or closed when you press Run.</li><li>With <i>Air supply = Off</i> the valve cannot move (there is no spring) and a warning is shown.</li><li><i>Stroke time</i> is the time for the full travel. A pulse shorter than the stroke time moves the valve only part-way – the valve then continues only if the coil is still energised.</li></ul>`}};
let vlDlg=null;
function vlHelp(k,c){const H=VLH[k];
 if(!vlDlg){vlDlg=document.createElement('dialog');vlDlg.id='dVLH';document.body.appendChild(vlDlg);vlDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))vlDlg.close()})}
 vlDlg.innerHTML=`<h2>${H.t} – how it works &amp; how to wire it</h2>${vlDiag(k)}${H.w}
  <h4>Troubleshooting</h4><table><tr><th>You see</th><th>Check</th></tr><tr><td>Valve stays CLOSED / does not move</td><td>COM (A2) not connected to 0 V, voltage below 70 % of the coil rating, or the switch / PLC output is off.</td></tr><tr><td>“terminal(s) not connected”</td><td>The COM / coil terminals need a wire (unused Y terminals on the panel are fine).</td></tr><tr><td>Overvoltage warning</td><td>The supply is more than 15 % above the coil voltage – set the right <i>Coil voltage</i>.</td></tr></table>
  <div class=act><button class=pri data-x>Close</button></div>`;vlDlg.showModal()}
