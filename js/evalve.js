/* ElectroSim v8.6 – Electric modulating valve (motorised actuator on a valve body). Library group "Valves & Actuators". Loaded after pneumatic.js.
   vem  Electric valve actuator: 24 V supply (L+ / N) and a selectable CONTROL TYPE – like Belimo / Danfoss / Siemens actuators:
          Modulating 0-10 V · Modulating 2-10 V · Modulating 4-20 mA   → terminal Y (signal +), common = N; valve goes to the % given by the signal
          Open / Close (2-position)                                   → terminals OPEN and CLOSE: 24 V on OPEN drives fully open, 24 V on CLOSE drives fully closed
          3-point floating                                            → terminals OPEN and CLOSE: runs while energised, stops when the voltage is removed
        Optional position feedback X (0-10 V / 2-10 V) and ZSO / ZSC end-limit switches (dry contacts). No air is needed.
   Terminal index (fixed, so saved wires survive a change of control type):
        0 L+ (24 V)  1 N (0 V, signal common)  2 Y or OPEN  3 CLOSE (hidden when modulating)  4 X feedback (hidden when feedback is off)
        5-6 ZSO (open limit) 1-2   7-8 ZSC (closed limit) 1-2                                                                              */
'use strict';
const VEC=['Modulating 0-10 V','Modulating 2-10 V','Modulating 4-20 mA','Open / Close (2-position)','3-point floating'];
const VEF=['Stay in last position','Spring return – closed','Spring return – open'];
const VEB=['Off','On'];
const veCt=c=>VEC.includes(c.p.ctl)?c.p.ctl:VEC[0];
const veMod=c=>VEC.indexOf(veCt(c))<3;                 /* analogue (modulating) control */
const veFb=c=>c.p.fb===VEB[1];
const vePos=c=>{const s=c.s;return typeof s.pos==='number'?s.pos:c.p.ini===VAI[1]?1:0};
const veLs=c=>{const p=vePos(c);return[p>=.995,p<=.005]};          /* [open limit made, closed limit made] */
const veTxt=c=>{const p=vePos(c),s=c.s;if(p>=.995)return'OPEN';if(p<=.005)return'CLOSED';return(s.dir>0?'OPENING ':s.dir<0?'CLOSING ':'AT ')+Math.round(p*100)+' %'};
const veOn=(prev,v,V)=>prev?Math.abs(v)>=.3*V:Math.abs(v)>=.7*V;
const veRng=c=>veCt(c)===VEC[0]?'0-10 V':'2-10 V';                  /* range of the feedback output follows the control range */

/* terminal list depends on control type and feedback option (cached per combination) */
const veDefs={};
function veDef(c){const m=veMod(c),fb=veFb(c),k=VEC.indexOf(veCt(c))+'_'+(fb?1:0);            /* cache key */
 if(veDefs[k])return veDefs[k];
 const ct=veCt(c),y=ct===VEC[2]?'Y  (4-20 mA signal +)':m?'Y  (control signal +, '+(ct===VEC[0]?'0-10 V':'2-10 V')+')':'OPEN  (24 V = drive open)';
 const t=[[-48,-60,'L+  (24 V supply)'],[-24,-60,m?'N  (0 V, supply and signal common)':'N  (0 V common)'],[0,-60,y],
  m?[24,-60,'CLOSE','oh']:[24,-60,'CLOSE  (24 V = drive closed)','o'],
  fb?[48,-60,'X  (position feedback 0-10 V)','o']:[48,-60,'X','oh'],
  [100,-20,'ZSO 1 (open limit)','o'],[100,0,'ZSO 2 (open limit)','o'],[100,20,'ZSC 1 (closed limit)','o'],[100,40,'ZSC 2 (closed limit)','o']];
 if(!m)t[2][3]='o';                                                    /* OPEN is optional: a 2-position actuator may be wired with one port only */
 return veDefs[k]=Object.assign(Object.create(D.vem),{t,bb:[-66,-72,188,142]})}

function veTick(c){const s=c.s,p=c.p,T=Math.max(.5,+p.T||10),pos=vePos(c);let tg=pos;
 if(s.pw){const ct=veCt(c);
  if(veMod(c))tg=s.brk?0:(s.sig||0)/100;                                /* modulating: follow the signal (wire break → closed) */
  else if(ct===VEC[3]){if(s.eo&&!s.ec)tg=1;else if(s.ec&&!s.eo)tg=0}   /* 2-position: drive to the end stop and stay there */
  else{if(s.eo&&!s.ec)tg=Math.min(1,pos+1);else if(s.ec&&!s.eo)tg=Math.max(0,pos-1)}}   /* 3-point: runs only while energised */
 else if(p.fs===VEF[1])tg=0;else if(p.fs===VEF[2])tg=1;                  /* power failure: spring return */
 s.tg=tg;const r=DT/T;s.pos=Math.abs(tg-pos)<=r?tg:pos+Math.sign(tg-pos)*r;s.dir=Math.sign(tg-pos)}

/* ---------- symbol ---------- */
const veLsBox=(y0,lbl,on)=>`<rect x=60 y=${y0} width=32 height=40 rx=4 style="fill:#fff;stroke:#173d57;stroke-width:1.8" /><text x=76 y=${y0+16} style="font:700 10px Arial;fill:#173d57;text-anchor:middle">${lbl}</text><circle cx=76 cy=${y0+29} r=6 style="fill:${on?VLC.open:'#fff'};stroke:#173d57;stroke-width:1.4" />`;
function veBody(c){
 const run=!!S.run,s=c.s,p=vePos(c),col=run?vlCol(p):VLC.off,[lo,lc]=run?veLs(c):[0,0],m=veMod(c),ct=veCt(c),
  ux=ct===VEC[0]?'0-10 V':ct===VEC[1]?'2-10 V':ct===VEC[2]?'4-20 mA':ct===VEC[3]?'OPEN / CLOSE':'3-POINT',
  sg=run&&s.pw?(m?(s.brk?'BREAK':Math.round(s.sig||0)+' %'):''):'',tx=run?(s.pw?veTxt(c):'NO POWER'):'';
 let h=`<path d="M-58 36H-16M16 36H58" class=s /><path d="M0 8V26" class=s />`+
  /* actuator housing with motor */
  `<rect x=-54 y=-22 width=108 height=30 rx=6 style="fill:${run?'#eef3f7':'#e8eef3'};stroke:#173d57;stroke-width:1.8" />`+
  `<circle cx=-36 cy=-7 r=11 style="fill:#fff;stroke:#173d57;stroke-width:1.5" /><text x=-36 y=-3.5 style="font:700 11px Arial;fill:#173d57;text-anchor:middle">M</text>`+
  /* position gauge */
  `<rect x=-20 y=-14 width=66 height=8 rx=2 style="fill:#fff;stroke:#173d57;stroke-width:1" /><rect x=-20 y=-14 width=${run?Math.max(0,66*p):0} height=8 rx=2 style="fill:${col}" />`+
  `<text x=13 y=3 style="font:700 7px Arial;fill:#173d57;text-anchor:middle">${run?tx:'ELECTRIC'}</text>`+
  /* valve body */
  `<path d="M-16 26L0 36-16 46ZM16 26L0 36 16 46Z" style="fill:${col};stroke:#173d57;stroke-width:1.5;stroke-linejoin:round" />${run&&p<=.005?`<path d="M0 26V46" style="stroke:#173d57;stroke-width:2.5" />`:''}`+
  veLsBox(-30,'ZSO',lo)+veLsBox(12,'ZSC',lc)+
  `<text x=-45 y=-42 style="${vlLbl};text-anchor:start">L+</text><text x=-21 y=-42 style="${vlLbl};text-anchor:start">N</text><text x=3 y=-42 style="${vlLbl};text-anchor:start">${m?'Y':'OPEN'}</text>`+
  (m?'':`<text x=27 y=-42 style="${vlLbl};text-anchor:start">CLOSE</text>`)+(veFb(c)?`<text x=51 y=-52 style="${vlLbl};text-anchor:start">X</text>`:'')+
  `<text x=112 y=-14 style="${vlLbl};text-anchor:start">1</text><text x=112 y=6 style="${vlLbl};text-anchor:start">2</text><text x=112 y=26 style="${vlLbl};text-anchor:start">1</text><text x=112 y=46 style="${vlLbl};text-anchor:start">2</text>`;
 if(run&&s.pw&&m)h+=`<text x=0 y=62 style="font:700 8px Arial;text-anchor:middle;fill:${s.brk?VLC.shut:'#0b6fb8'}">${s.brk?'SIGNAL LOST':(ct===VEC[2]?(s.sm||0).toFixed(1)+' mA':(s.sv||0).toFixed(1)+' V')+'  →  '+sg}</text>`;
 else h+=`<text x=0 y=62 style="font:700 8px Arial;text-anchor:middle;fill:${run?(s.pw?'#0b6fb8':VLC.shut):'#6b7f92'}">${run?(s.pw?(m?'':(s.eo?'OPEN input ON':s.ec?'CLOSE input ON':'no command')):'NO POWER'):ux}</text>`;
 return h}

D.vem={n:'Electric modulating valve (0-10 V / 4-20 mA / open-close actuator)',
 ds:'Motorised (electric) control valve actuator, 24 V: modulating 0-10 V, 2-10 V or 4-20 mA, or open / close and 3-point floating, with ZSO / ZSC limit switches',
 cat:'Valves & Actuators',pre:'XV',sx:50,sy:22,sc0:.8,
 t:[[-48,-60,'L+  (24 V supply)'],[-24,-60,'N  (0 V common)'],[0,-60,'Y'],[24,-60,'CLOSE','oh'],[48,-60,'X','oh'],[100,-20,'ZSO 1 (open limit)','o'],[100,0,'ZSO 2 (open limit)','o'],[100,20,'ZSC 1 (closed limit)','o'],[100,40,'ZSC 2 (closed limit)','o']],
 bb:[-66,-72,188,142],
 p:{ctl:[VEC[0],'','Control type (signal)',VEC],fs:[VEF[0],'','If the power fails',VEF],fb:[VEB[0],'','Position feedback output X',VEB],V:[24,'V','Supply voltage'],P:[5,'W','Power consumption'],T:[10,'s','Stroke time (0-100 %)'],ini:[VAI[0],'','Position at start',VAI],ls:[LST[0],'','Limit switch contacts',LST]},
 dyn:c=>veDef(c),
 icon:`<rect x=-22 y=-16 width=44 height=18 rx=4 class=s style="fill:#e8eef3" /><circle cx=-11 cy=-7 r=6 class=s style="fill:#fff" /><text x=-11 y=-4 style="font:700 8px Arial;fill:#173d57;text-anchor:middle">M</text><rect x=-1 y=-11 width=18 height=5 rx=1 class=s style="fill:#fff" /><path d="M-9 4L0 12-9 20ZM9 4L0 12 9 20Z" class=s style="fill:#fff" /><path d="M0 2V12" class=s />`,
 chg:(c,k)=>{if(k==='ctl'||k==='fb'){vlPrune(c);return true}return false},
 el:c=>{const V=+c.p.V||24,E=[RR(0,1,V*V/Math.max(+c.p.P,.1))],ct=veCt(c);
  if(ct===VEC[2])E.push(RR(2,1,500));                                  /* 4-20 mA input: 500 Ω (Danfoss datasheet) */
  else if(veMod(c))E.push(RR(2,1,24e3));                               /* 0-10 V input: 24 kΩ */
  else{E.push(RR(2,1,V*V/.5),RR(3,1,V*V/.5))}                          /* OPEN / CLOSE inputs: 0.5 W each */
  const[o,k]=veLs(c),nc=c.p.ls===LST[1],r=v=>(nc?!v:v)?.005:1e9;
  E.push(RR(5,6,r(o)),RR(7,8,r(k)));
  if(veFb(c)){const rg=veRng(c),p=vePos(c);E.push({k:'V',a:4,b:1,v:c.s.pw?(rg==='0-10 V'?10*p:2+8*p):0})}   /* feedback X: ideal 0(2)-10 V source */
  return E},
 sim:(c,E)=>{const s=c.s,V=+c.p.V||24,ct=veCt(c);if(S.time===0){s.pos=undefined;s.tg=undefined}
  const pw=veOn(s.pw,E[0].v2,V)?1:0,chg=pw!==(s.pw?1:0)?1:0;s.pw=pw;s.vm2=Math.abs(E[0].v2);s.im2=Math.abs(E[0].cur);s.pw2=Math.abs(E[0].v2*E[0].cur);
  s.brk=0;
  if(veMod(c)){const e=E[1];let pct;
   if(ct===VEC[2]){const mA=e.cur*1e3;s.sm=mA;s.brk=pw&&mA<3.6?1:0;pct=(mA-4)/16*100}
   else{s.sv=e.v2;if(ct===VEC[1]){s.brk=pw&&e.v2<1?1:0;pct=(e.v2-2)/8*100}else pct=e.v2/10*100}
   s.sig=Math.max(0,Math.min(100,pct));s.eo=s.ec=0;s.im2+=Math.abs(e.cur)}
  else{s.eo=veOn(s.eo,E[1].v2,V)?1:0;s.ec=veOn(s.ec,E[2].v2,V)?1:0;s.sig=0;s.im2+=Math.abs(E[1].cur)+Math.abs(E[2].cur)}
  return chg},
 tk:veTick,
 fin:c=>{const s=c.s;c.o={v:s.vm2||0,i:s.im2||0,p:s.pw2||0}},
 st:c=>{const s=c.s;if(!S.run)return veTxt(c);return(s.pw?veTxt(c):'NO POWER · '+veTxt(c))+(veMod(c)&&s.pw?(s.brk?' · SIGNAL LOST':' · setpoint '+Math.round(s.sig||0)+' %'):'')},
 msg:c=>{const r=[],s=c.s,ct=veCt(c),V=+c.p.V||24;if(!S.run)return r;
  if(s.vm2>1.2*V)r.push(['wa',`${c.label}: supply ${s.vm2.toFixed(1)} V is above the rated ${V} V`]);
  if(!s.pw)r.push(['wa',`${c.label}: no supply voltage on L+ / N (needs ≥ 70 % of ${V} V) – ${c.p.fs===VEF[0]?'the valve stays where it is':'the spring drives it '+(c.p.fs===VEF[1]?'closed':'open')}`]);
  else if(veMod(c)){
   if(s.brk)r.push(['wa',ct===VEC[2]?`${c.label}: 4-20 mA signal lost (${(s.sm||0).toFixed(1)} mA < 3.6 mA) – wire break or no signal, valve driven closed`:`${c.label}: 2-10 V signal lost (${(s.sv||0).toFixed(1)} V < 1 V) – wire break or no signal, valve driven closed`]);
   else if(ct===VEC[2]&&s.sm>21)r.push(['wa',`${c.label}: signal ${s.sm.toFixed(1)} mA is above 20 mA`]);
   else if(ct!==VEC[2]&&(s.sv>10.5||s.sv<-.5))r.push(['wa',`${c.label}: signal ${s.sv.toFixed(1)} V is outside the 0-10 V range`])}
  else if(s.eo&&s.ec)r.push(['wa',`${c.label}: OPEN and CLOSE are both energised – the valve stays where it is (interlock them)`]);
  return r},
 help:c=>veHelp(c),
 pp:c=>{const s=c.s,run=S.run,p=vePos(c),[lo,lc]=veLs(c),nc=c.p.ls===LST[1],ct=veCt(c),m=veMod(c),
  ls=(on,n)=>`<b style="color:${on?VLC.open:'#6b7f92'}">${n}: ${(nc?!on:on)?'contact CLOSED':'contact open'}</b>`;
  let how;
  if(m)how=`<b>${ct}:</b> supply <b>${c.p.V} V</b> on <b>L+</b> / <b>N</b>. Wire the control signal to <b>Y</b> (signal +) and its 0 V / return to <b>N</b> – from a PLC analogue output (AO) or a signal injector. ${ct===VEC[0]?'0 V = closed, 10 V = open.':ct===VEC[1]?'2 V = closed, 10 V = open (below 1 V = wire break → closed).':'4 mA = closed, 20 mA = open (below 3.6 mA = wire break → closed).'} The valve goes to the matching position and stays there – anywhere from 0 to 100 %.${run&&s.pw?` Signal now: <b>${ct===VEC[2]?(s.sm||0).toFixed(2)+' mA':(s.sv||0).toFixed(2)+' V'}</b> → setpoint <b>${Math.round(s.sig||0)} %</b>.`:''}`;
  else if(ct===VEC[3])how=`<b>Open / Close (2-position):</b> supply <b>${c.p.V} V</b> on <b>L+</b> / <b>N</b>. Put ${c.p.V} V (switch, relay contact or PLC output) on <b>OPEN</b> → the valve drives fully open; on <b>CLOSE</b> → fully closed. With both off it stays where it is. Never energise both together.`;
  else how=`<b>3-point floating:</b> supply <b>${c.p.V} V</b> on <b>L+</b> / <b>N</b>. While <b>OPEN</b> has ${c.p.V} V the valve keeps opening, while <b>CLOSE</b> has it the valve keeps closing, and it stops where it is when the voltage is removed. A controller gives short pulses to hold a position.`;
  return`<div class=sec>Valve</div><p style="margin:2px 0">${run?`<b style="color:${vlCol(p)}">${esc(veTxt(c))}</b> (${Math.round(p*100)} %) · ${s.pw?'powered':'<b style="color:'+VLC.shut+'">no power</b>'}<br>${ls(lo,'ZSO (open limit)')}<br>${ls(lc,'ZSC (closed limit)')}`:'Press ▶ Run to see the valve move.'}</p>
  <p class=mu>${how} Travel time (0-100 %): <b>${c.p.T} s</b>. If the power fails: <b>${c.p.fs}</b>.</p>
  ${veFb(c)?`<p class=mu><b>Feedback X:</b> an output of ${veRng(c)} that follows the real position (0 % = ${veRng(c)==='0-10 V'?'0':'2'} V, 100 % = 10 V). Wire X and N to a PLC analogue input (AI, 0-10 V).</p>`:''}
  <p class=mu><b>Limit switches:</b> ZSO (terminals 1-2) ${nc?'opens':'closes'} when fully OPEN, ZSC ${nc?'opens':'closes'} when fully CLOSED – dry contacts for a lamp or PLC input. Press <b>❓ Help</b> for the wiring diagram.</p>`},
 g:c=>veBody(c)};

/* ---------- Help dialog with wiring diagram ---------- */
let veDlg=null;
function veDiag(c){
 const ct=veCt(c),m=veMod(c),R='#d93a3a',B='#2f7fae',G='#12a36b',O='#c9791a',
  pl=(pts,col)=>`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" />`,
  T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y)=>`<circle cx="${x}" cy="${y}" r="4" fill="var(--pn)" stroke="var(--tx)" stroke-width="1.5" />`,
  box=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1),
  sw=(x,y,t)=>`<rect x="${x}" y="${y}" width="86" height="26" rx="5" fill="var(--pn)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+43,y+17,t,'middle');
 let h=`<svg viewBox="0 0 600 310" role="img" aria-label="wiring diagram">`+box(10,40,100,100,'24 V supply')+T(20,72,'+24 V')+T(20,122,'0 V')+dot(110,68)+dot(110,118)+
  box(430,40,150,170,'Electric valve')+T(440,72,'L+ (24 V)')+T(440,102,'N (0 V)')+dot(430,68)+dot(430,98)+
  pl('110,68 430,68',R)+pl('110,118 150,118 150,98 430,98',B);
 if(m){const u=ct===VEC[2]?'4-20 mA':ct===VEC[1]?'2-10 V':'0-10 V';
  h+=box(180,160,150,70,'PLC AO / signal injector')+T(190,192,'AO + ('+u+')')+T(190,216,'M / − (0 V)')+dot(330,188)+dot(330,212)+T(440,132,'Y (signal +)')+dot(430,128)+
   pl('330,188 380,188 380,128 430,128',G)+pl('330,212 400,212 400,98 430,98',B)+T(335,252,'Common: PLC 0 V = valve N = supply 0 V',null)}
 else{h+=sw(190,60+0,'Switch / Q0.0')+T(440,132,'OPEN')+dot(430,128)+pl('110,68 150,68',R)+pl('150,68 150,92 190,92',R)+pl('150,92 150,92',R)+
   pl('276,73 360,73 360,128 430,128',G)+sw(190,150,'Switch / Q0.1')+T(440,162,'CLOSE')+dot(430,158)+pl('150,68 150,163 190,163',R)+pl('276,163 400,163 400,158 430,158',G)}
 /* feedback and limit switches */
 h+=T(440,192,'ZSO / ZSC  (dry contacts)')+dot(500,200)+dot(530,200)+pl('500,200 500,262 120,262',O)+pl('530,200 530,284 120,284',O)+T(10,258,'ZSO to PLC input I0.0')+T(10,280,'ZSC to PLC input I0.1')+
  `</svg>`;
 return h}
function veHelp(c){
 if(!veDlg){veDlg=document.createElement('dialog');veDlg.id='dVLH';veDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))veDlg.close()});document.body.appendChild(veDlg)}
 veDlg.id='dVLH';
 veDlg.innerHTML=`<h2>Electric modulating valve – how it works &amp; how to wire it</h2>${veDiag(c)}
  <h4>1. What it is</h4><p>A <b>control valve</b> (globe, ball or butterfly) turned by an <b>electric motor actuator</b> – no compressed air. Typical parts: Belimo, Danfoss AME, Siemens, Honeywell, ESBE. The actuator has <b>power terminals</b> (24 V AC/DC: L+ and N), a <b>control input</b> and, optionally, a <b>position feedback output</b> and <b>end-limit switches</b>.</p>
  <h4>2. Choose the control type (Properties → <i>Control type</i>)</h4>
  <table><tr><th>Control type</th><th>Terminals used</th><th>What the valve does</th></tr>
   <tr><td><b>Modulating 0-10 V</b></td><td>L+, N, <b>Y</b></td><td>Goes to a position proportional to the voltage: 0 V = closed, 5 V = 50 %, 10 V = open.</td></tr>
   <tr><td><b>Modulating 2-10 V</b></td><td>L+, N, <b>Y</b></td><td>2 V = closed, 10 V = open. Below 1 V the signal is treated as a wire break (valve closes) – this lets the actuator detect a broken cable.</td></tr>
   <tr><td><b>Modulating 4-20 mA</b></td><td>L+, N, <b>Y</b></td><td>4 mA = closed, 20 mA = open. Input resistance 500 Ω. Below 3.6 mA = wire break.</td></tr>
   <tr><td><b>Open / Close (2-position)</b></td><td>L+, N, <b>OPEN</b>, <b>CLOSE</b></td><td>24 V on OPEN → drives fully open and stays; 24 V on CLOSE → fully closed. No voltage on either → stays where it is.</td></tr>
   <tr><td><b>3-point floating</b></td><td>L+, N, <b>OPEN</b>, <b>CLOSE</b></td><td>Moves only while a terminal is energised (e.g. 5 s pulse = part-way) and stops when the voltage is removed. Used with a controller that has two relay / triac outputs.</td></tr></table>
  <h4>3. How to connect it (modulating)</h4><ol><li><b>24 V supply</b>: + to <b>L+</b>, 0 V to <b>N</b>.</li><li><b>Signal</b>: the PLC analogue output <b>AO0</b> (set to 0-10 V or 4-20 mA in the PLC properties) to <b>Y</b>; the PLC <b>M</b> (0 V) to <b>N</b>. A <b>Signal Injector</b> can be used instead: its + to Y, its − to N.</li><li>Press <b>▶ Run</b> and change the signal: the valve moves (amber, with the percentage) to the new position in the <i>Stroke time</i>.</li><li>Optional <b>feedback X</b> (Properties → <i>Position feedback output</i> = On) gives 0-10 V for the real position – wire X and N to a PLC AI input.</li></ol>
  <h4>4. In this simulator</h4><ul><li><i>If the power fails</i> – <b>stay in last position</b> (standard actuator) or <b>spring return</b> to closed / open (safety actuator).</li><li><i>Stroke time</i> is the time for 0-100 %. Real actuators are slower than air actuators (30-150 s); the default is 10 s so you can watch it.</li><li><b>ZSO / ZSC</b> are dry contacts (NO or NC); both are in the in-between state while the valve travels.</li><li>The supply input draws <i>Power consumption</i> ÷ voltage; the signal input loads the source (24 kΩ or 500 Ω).</li></ul>
  <h4>Troubleshooting</h4><table><tr><th>You see</th><th>Check</th></tr><tr><td>NO POWER</td><td>L+ / N are not connected to the 24 V supply, or the supply is below 70 % of <i>Supply voltage</i>.</td></tr><tr><td>Signal lost – valve closes</td><td>2-10 V or 4-20 mA signal is below its live zero: wire break, AO is off, or Y / N are not connected. Check the common (N) is joined to the PLC 0 V.</td></tr><tr><td>Valve ignores the signal</td><td>Control type does not match the PLC AO type (0-10 V vs 4-20 mA).</td></tr><tr><td>Overvoltage warning</td><td>The supply is more than 20 % above <i>Supply voltage</i>.</td></tr></table>
  <div class=act><button class=pri data-x>Close</button></div>`;veDlg.showModal()}
