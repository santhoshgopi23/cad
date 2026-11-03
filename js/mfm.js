/* ElectroSim v8.9 – Multi-function meter (MFM), library group "Instruments". Loaded after evalve.js.
   A panel-mounted power / energy meter, like a Schneider iEM / PM, Selec MFM or Siemens PAC:
   V (L-N and L-L), I, kW, kVAr, kVA, power factor, frequency and energy (kWh, kVArh, kVAh).
   Terminals (fixed index, so saved wires survive a change of "Wiring"):
     0-2  I1 / I2 / I3 IN  (top)     3-5  I1 / I2 / I3 OUT (bottom)     – the load current passes THROUGH the meter (direct connection)
     6-8  V1 / V2 / V3 voltage sense (left, 1 MΩ)                       9  N (neutral reference; optional on 3-phase = virtual star point)
   ONE component; the "Meter type" property picks Direct / CT operated / CT + PT operated (terminal names, properties and symbol change).
   Old projects with the separate types mfmc / mfmp are converted on load (mfLegacy).
   Wiring "Single-phase": only I1 / V1 / N are used; the other terminals are hidden.
   Measured from the solver's complex phasors (vr, vi, cr, ci): P = Re(V·I*), Q = Im(V·I*), S = |P + jQ|, PF = P / S.
   Energy is integrated every tick (tk); the "Energy clock" setting speeds it up (3600 = one simulated second counts as one hour). */
'use strict';
const MFN=['Three-phase (3 or 4 wire)','Single-phase'];
const MFK=['Direct (current passes through the meter)','CT operated (/5 A or /1 A)','CT + PT operated'];   /* Meter type */
const mfK=c=>{const i=MFK.indexOf(c.p.typ);return i<0?0:i};                  /* 0 direct, 1 CT operated, 2 CT + PT operated */
const MFNM=['Multi-function meter (MFM) – direct','Multi-function meter (MFM) – CT operated','Multi-function meter (MFM) – CT + PT operated'];
const mfPh=c=>c.p.net===MFN[1]?1:3;
const mfE=(v,u)=>{const a=Math.abs(v);if(a<1e-3)return'0 '+u;const[k,s]=a>=1e6?[1e6,'M']:a>=1e3?[1e3,'k']:a<1?[1e-3,'m']:[1,''],x=a/k;return(v<0?'-':'')+x.toFixed(x>=100?0:x>=10?1:2)+' '+s+u};
const mfPages=c=>mfPh(c)===3?[0,1,2,3,4,5,6]:[0,2,3,4,6];                 /* page ids shown for this wiring */
const mfPg=c=>{const p=mfPages(c);return p[((c.s.pg||0)%p.length+p.length)%p.length]};
const mfCt=c=>mfK(c)>0;                               /* CT operated or CT + PT operated */
const mfT=(one,k)=>{const ct=k>0,o=one?'oh':'o',n=(i,s)=>'I'+i+' '+s+(ct?(s==='S1'?' (CT secondary +)':' (CT secondary −)'):''),a=ct?'S1':'in',b=ct?'S2':'out',vt=k===2?' (PT secondary)':'';
 return[[-20,-60,n(1,a),''],[0,-60,n(2,a),o],[20,-60,n(3,a),o],[-20,60,n(1,b),''],[0,60,n(2,b),o],[20,60,n(3,b),o],
 [-60,-20,'V1'+vt,''],[-60,0,'V2'+vt,o],[-60,20,'V3'+vt,o],[-60,40,'N'+vt+(k===2?'':' (neutral)'),one?'':'o']]};
const mfDv={};                                           /* terminal sets, one per (meter type, wiring) */
const mfDyn=c=>{const k=mfK(c),one=mfPh(c)===1?1:0,key=k+'.'+one;return mfDv[key]||(mfDv[key]=Object.assign(Object.create(D.mfm),{t:mfT(one,k)}))};
/* properties shown for this meter type (read by the Properties panel and the parts list) */
const mfPv={};
const mfPV=c=>{const k=mfK(c);if(!mfPv[k]){const b=D.mfm.p,o={};['typ','net',...(k?['ctp','cts']:['I']),...(k===2?['ptp','pts']:[]),'acc'].forEach(x=>o[x]=b[x]);mfPv[k]=o}return mfPv[k]};
/* CT / PT ratios set in the meter: displayed values = measured × ratio */
const mfKi=c=>mfCt(c)?(+c.p.ctp||1)/(+c.p.cts||1):1,mfKv=c=>mfK(c)===2?(+c.p.ptp||1)/(+c.p.pts||1):1;
function mfRows(c,pg){const m=c.s.m,s=c.s,ph=mfPh(c),ln=['L1','L2','L3'];
 if(!m||!S.run)return[['','---'],['','---'],['','---']];
 switch(pg){
  case 0:return m.V.map((v,i)=>[ln[i],mfE(v,'V')]);
  case 1:return m.L.map((v,i)=>[['L12','L23','L31'][i],mfE(v,'V')]);
  case 2:return m.I.map((v,i)=>[ln[i],mfE(v,'A')]);
  case 3:return[['P',mfE(m.Pt,'W')],['Q',mfE(m.Qt,'var')],['S',mfE(m.St,'VA')]];
  case 4:return[['PF',m.pf==null?'---':m.pf.toFixed(2)],['Hz',m.hz.toFixed(1)+' Hz'],['Iavg',mfE(m.Ia,'A')]];
  case 5:return m.P.map((v,i)=>[ln[i],mfE(v,'W')]);
  default:return[['IMP',mfE(s.wh||0,'Wh')],['REA',mfE(s.varh||0,'varh')],['APP',mfE(s.vah||0,'VAh')]]}}
const MFT=['VOLTAGE L-N','VOLTAGE L-L','CURRENT','POWER  TOTAL','PF · HZ · I AVG','ACTIVE POWER','ENERGY'];

D.mfm={n:'Multi-function meter (MFM)',ds:'Panel-mounted multi-function power and energy meter: V, I, kW, kVAr, kVA, PF, Hz, kWh – direct, CT operated or CT + PT operated (choose the Meter type in Properties), three-phase or single-phase',cat:'Instruments',pre:'PM',sx:38,sy:44,vs:0,
 t:mfT(0,0),bb:[-84,-68,130,136],
 p:{typ:[MFK[0],'','Meter type',MFK],net:[MFN[0],'','Wiring',MFN],I:[63,'A','Rated current (direct connection)'],
  ctp:[100,'A','CT primary (set in the meter – must match the CT)'],cts:[5,'A','CT secondary (meter input: 1 A or 5 A)',['1','5']],
  ptp:[11000,'V','PT primary voltage (L-N)'],pts:[110,'V','PT secondary voltage (L-N)'],
  acc:[1,'×','Energy clock speed (1 = real time, 3600 = 1 s counts as 1 h)']},
 pv:mfPV,nv:c=>MFNM[mfK(c)],
 icon:`<rect x=-24 y=-24 width=48 height=48 rx=4 class=s style="fill:#eef2f6" /><rect x=-18 y=-18 width=36 height=22 rx=2 style="fill:#1d3a2a;stroke:#173d57;stroke-width:1" /><text y=-4 style="fill:#8ff0b0;font:700 8px monospace;text-anchor:middle">kWh</text><text y=16 class=mt style="font-size:8px;font-weight:700">MFM</text>`,
 dyn:mfDyn,
 chg:(c,k)=>{if(k==='net'||k==='typ'){vlPrune(c);c.s.pg=0;return true}return false},
 /* series current element per phase (1 mΩ), star voltage sense per phase to N (1 MΩ) and, three-phase only, delta sense for L-L */
 el:c=>{const ph=mfPh(c),e=[];for(let i=0;i<ph;i++)e.push(RR(i,i+3,.001));for(let i=0;i<ph;i++)e.push(RR(6+i,9,1e6));if(ph===3)e.push(RR(6,7,1e6),RR(7,8,1e6),RR(8,6,1e6));return e},
 sim:(c,E,X)=>{const s=c.s,ph=mfPh(c);if(S.time===0){s.wh=s.whx=s.varh=s.vah=0}
  const I=[],V=[],P=[],Q=[],L=[];
  for(let i=0;i<ph;i++){const a=E[i],b=E[ph+i];I[i]=Math.hypot(a.cr,a.ci);V[i]=Math.hypot(b.vr,b.vi);P[i]=b.vr*a.cr+b.vi*a.ci;Q[i]=b.vi*a.cr-b.vr*a.ci}
  if(ph===3)for(let i=0;i<3;i++)L[i]=Math.hypot(E[6+i].vr,E[6+i].vi);
  const ki=mfKi(c),kv=mfKv(c),Ir=I.slice(),Vr=V.slice();                /* raw = what the meter input really sees */
  for(let i=0;i<ph;i++){I[i]*=ki;V[i]*=kv;P[i]*=ki*kv;Q[i]*=ki*kv}if(ph===3)for(let i=0;i<3;i++)L[i]*=kv;
  const sum=a=>a.reduce((x,y)=>x+y,0),Pt=sum(P),Qt=sum(Q),St=Math.hypot(Pt,Qt);
  let hz=0;for(let i=0;i<ph;i++){const f=X.fq[E[ph+i].na];if(f>0){hz=f;break}}
  s.m={V,I,P,Q,L,Pt,Qt,St,pf:St>1e-3?Pt/St:null,hz,Ia:sum(I)/ph,Im:Math.max(...I),Vm:ph===3?sum(L)/3:V[0],Isec:Math.max(...Ir),Vsec:Math.max(...Vr),ki,kv};return 0},
 tk:c=>{const s=c.s,m=s.m;if(!m||!S.run)return;const k=DT*Math.max(0,+c.p.acc||0)/3600;       /* → Wh */
  if(m.Pt>=0)s.wh=(s.wh||0)+m.Pt*k;else s.whx=(s.whx||0)-m.Pt*k;s.varh=(s.varh||0)+Math.abs(m.Qt)*k;s.vah=(s.vah||0)+m.St*k},
 fin:c=>{const m=c.s.m;c.o=m?{v:m.Vm,i:m.Im,p:m.Pt}:{v:0,i:0,p:0}},
 st:c=>{const m=c.s.m;return m?`${mfE(m.Pt,'W')} · PF ${m.pf==null?'–':m.pf.toFixed(2)} · ${mfE((c.s.wh||0),'Wh')}`:''},
 msg:c=>{const m=c.s.m,r=[],ct=mfCt(c),rated=ct?+c.p.ctp:+c.p.I;if(!S.run||!m)return r;
  if(!ct&&m.Im>c.p.I)r.push(['wa',`${c.label}: current ${mfE(m.Im,'A')} exceeds the meter's direct rating of ${c.p.I} A`]);
  if(ct&&m.Isec>1.2*c.p.cts)r.push(['wa',`${c.label}: CT secondary input ${m.Isec.toFixed(2)} A is above the ${c.p.cts} A input range – wrong CT ratio?`]);
  if(m.Im>.0005*rated&&m.Vsec<(mfK(c)===2?2:5))r.push(['wa',`${c.label}: current flows but there is no voltage on V1…V3 – connect the voltage terminals${mfK(c)===2?' to the PT secondaries':' to the supply'}`]);
  {const pm=Math.max(...m.P.map(Math.abs)),neg=m.P.map((p,i)=>p<-.05*pm?'L'+(i+1):'').filter(Boolean);
   if(pm>1&&neg.length)r.push(['wa',`${c.label}: negative (reverse) power on ${neg.join(', ')} – check that the supply is on the IN side${ct?' and the CT polarity (S1 / S2 swapped?)':''}, or that the load is not regenerating`])}return r},
 clk:(c,a)=>{const n=mfPages(c).length,s=c.s;if(a==='n')s.pg=((s.pg||0)+1)%n;else if(a==='p')s.pg=((s.pg||0)+n-1)%n;else if(a==='r'){s.wh=s.whx=s.varh=s.vah=0}S.dirty=1},
 help:c=>mfHelp(c),
 pp:c=>{const m=c.s.m,s=c.s,ph=mfPh(c),run=S.run&&m,ln=['L1','L2','L3'];let h=`<div class=row><button data-clk="p">◀ Page</button><button data-clk="n">Page ▶</button><button data-clk="r" title="Set the energy counters to zero">Reset energy</button></div>`;
  if(!run)return h+`<p class=mu>Press ▶ Run to see the readings. Click the display (or ◀ ▶) to change page.</p>`+mfWire(c);
  const pf=(p,q)=>{const sv=Math.hypot(p,q);return sv>1e-3?(p/sv).toFixed(2):'–'};
  h+=`<div class=sec>Readings</div><table class=iomap><tr><th></th><th>V</th><th>A</th><th>W</th><th>var</th><th>PF</th></tr>`+
   m.V.map((v,i)=>`<tr><td><b>${ln[i]}</b></td><td>${mfE(v,'')}</td><td>${mfE(m.I[i],'')}</td><td>${mfE(m.P[i],'')}</td><td>${mfE(m.Q[i],'')}</td><td>${pf(m.P[i],m.Q[i])}</td></tr>`).join('')+
   `<tr><td><b>Total</b></td><td>${mfE(ph===3?m.V.reduce((a,b)=>a+b,0)/3:m.V[0],'')}</td><td>${mfE(m.Ia,'')}</td><td><b>${mfE(m.Pt,'')}</b></td><td>${mfE(m.Qt,'')}</td><td><b>${m.pf==null?'–':m.pf.toFixed(2)}</b></td></tr></table>
   <table class=iomap>${ph===3?`<tr><td>V L12 / L23 / L31</td><td>${m.L.map(v=>mfE(v,'V')).join(' · ')}</td></tr>`:''}${mfCt(c)?`<tr><td>Meter input (CT secondary)</td><td>${m.Isec.toFixed(2)} A</td></tr>${mfK(c)===2?`<tr><td>Meter input (PT secondary)</td><td>${m.Vsec.toFixed(1)} V</td></tr>`:''}<tr><td>Multiplier CT × PT</td><td>${m.ki.toFixed(2)} × ${m.kv.toFixed(2)}</td></tr>`:''}<tr><td>Apparent power S</td><td>${mfE(m.St,'VA')}</td></tr><tr><td>Frequency</td><td>${m.hz.toFixed(1)} Hz</td></tr>
   <tr><td>Energy import</td><td>${mfE(s.wh||0,'Wh')}</td></tr><tr><td>Energy export</td><td>${mfE(s.whx||0,'Wh')}</td></tr><tr><td>Reactive energy</td><td>${mfE(s.varh||0,'varh')}</td></tr><tr><td>Apparent energy</td><td>${mfE(s.vah||0,'VAh')}</td></tr></table>`;
  return h+mfWire(c)},
 g:c=>{const run=!!S.run,pg=mfPg(c),idx=((c.s.pg||0)%mfPages(c).length)+1,rows=mfRows(c,pg),mono='font:700 8.5px ui-monospace,Menlo,Consolas,monospace';
  const k=mfK(c),tint=['#eef2f6','#fdf0d8','#e0f2e6'][k],tag=['DIRECT '+c.p.I+' A','CT '+c.p.ctp+'/'+c.p.cts+' A','CT '+c.p.ctp+'/'+c.p.cts+' · PT '+mfE(+c.p.ptp,'V').replace(' ','')+'/'+mfE(+c.p.pts,'V').replace(' ','')][k];
  let h=`<rect x=-38 y=-44 width=76 height=88 rx=4 class=s style="fill:${tint}" />`+`<text transform="translate(45 0) rotate(90)" style="font:700 6px Arial;fill:#173d57;text-anchor:middle">${esc(tag)}</text>`+
   `<g data-clk=n style="cursor:pointer"><rect x=-33 y=-30 width=66 height=48 rx=2 style="fill:#1d3a2a;stroke:#173d57;stroke-width:1" />`+
   `<text x=-30 y=-23 style="fill:#6fbf8f;font:700 5.5px Arial">${run?MFT[pg]:['MFM','MFM · CT','MFM · CT+PT'][k]}</text><text x=30 y=-23 style="fill:#6fbf8f;font:5.5px Arial;text-anchor:end">${idx}/${mfPages(c).length}</text>`+
   rows.map((r,i)=>`<text x=-30 y=${-11+12*i} style="fill:#6fbf8f;font:700 6.5px Arial">${r[0]}</text><text x=30 y=${-11+12*i} style="fill:#8ff0b0;${mono};text-anchor:end">${esc(r[1])}</text>`).join('')+`</g>`+
   `<g data-clk=p style="cursor:pointer"><rect x=-33 y=23 width=30 height=12 rx=2 style="fill:#dbe3ea;stroke:#173d57;stroke-width:1" /><text x=-18 y=32 class=mt style="font-size:8px">◀</text></g><g data-clk=n style="cursor:pointer"><rect x=3 y=23 width=30 height=12 rx=2 style="fill:#dbe3ea;stroke:#173d57;stroke-width:1" /><text x=18 y=32 class=mt style="font-size:8px">▶</text></g>`;
  const ph=mfPh(c),tx=(x,y,t,a,z)=>`<text x=${x} y=${y} style="font:700 ${z||6.5}px Arial;fill:#173d57;text-anchor:${a||'middle'}">${t}</text>`;
  /* terminal names drawn on the symbol follow the meter type: direct = IN / OUT, CT = S1 / S2 (CT secondary), PT = secondary a / n */
  const top=k?'S1':'IN',bot=k?'S2':'OUT',vp=k===2?' a':'';
  for(let i=0;i<ph;i++)h+=tx(-20+20*i,-38,'I'+(i+1)+' '+top,'middle',5.2)+tx(-20+20*i,41.5,'I'+(i+1)+' '+bot,'middle',5.2)+tx(-49,-23+20*i,'V'+(i+1)+vp,'middle',k===2?5.5:6.5);
  h+=tx(-49,37,k===2?'N n':'N','middle',k===2?5.5:6.5);return h}};

function mfWire(c){const ph=mfPh(c),n=ph===3?'I1 / I2 / I3':'I1';
 if(!mfCt(c))return`<p class=mu><b>Wiring:</b> pass each phase <b>through the meter</b>: supply to <b>${n} IN</b> (top), load from <b>${n} OUT</b> (bottom). Tap the same phases on to <b>V1${ph===3?' / V2 / V3':''}</b> (left) and the neutral to <b>N</b>. ${ph===3?'On a 3-wire system leave N open – the meter forms its own star point.':''} Press <b>❓ Help</b> for the diagram.</p>`;
 return`<p class=mu><b>Wiring:</b> put a <b>CT</b> in each phase line. Connect its <b>S1</b> to <b>${n} S1</b> (top) and the meter's <b>${n} S2</b> (bottom) back to the CT <b>S2</b>. ${mfK(c)===2?'The voltage comes from <b>PTs</b>: PT secondary <b>a</b> to <b>V1'+(ph===3?' / V2 / V3':'')+'</b>, the PT secondary <b>n</b> to <b>N</b>.':'Tap the phases directly to <b>V1'+(ph===3?' / V2 / V3':'')+'</b> and the neutral to <b>N</b>.'} <b>Set the CT${mfK(c)===2?' and PT':''} ratio in the meter's Properties to match the real transformer</b>, otherwise the readings are wrong. Never leave a CT secondary open. Press <b>❓ Help</b> for the diagram.</p>`}
let mfDlg=null;
function mfDiag(one){
 const T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y,c)=>`<circle cx="${x}" cy="${y}" r="3.5" fill="var(--pn)" stroke="${c}" stroke-width="1.5" />`,
  box=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1),
  ln=(p,c,d)=>`<polyline points="${p}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"${d?' stroke-dasharray="5 4"':''} />`,
  col=['#d98400','#7a4a21','#555'],B='#2f7fae',n=one?1:3;let h=`<svg viewBox="0 0 580 270" role="img" aria-label="meter wiring">`+box(10,40,90,one?90:130,'Supply')+box(230,40,120,one?90:130,'MFM')+box(480,40,90,one?90:130,'Load');
 for(let i=0;i<n;i++){const y=70+i*25;h+=ln(`100,${y} 230,${y}`,col[i])+ln(`350,${y} 480,${y}`,col[i])+T(104,y-4,'L'+(i+1))+T(236,y-4,'I'+(i+1)+' in')+T(344,y-4,'I'+(i+1)+' out','end')+dot(230,y,col[i])+dot(350,y,col[i])
  +ln(`${150+i*12},${y} ${150+i*12},${190+i*10} ${262+i*22},${190+i*10} ${262+i*22},${170+(one?-20:0)}`,col[i],1)+dot(150+i*12,y,col[i])+T(262+i*22,168+(one?-20:0),'V'+(i+1),'middle')+dot(262+i*22,170+(one?-20:0),col[i])}
 const yN=70+n*25;h+=ln(`100,${yN} 480,${yN}`,B)+T(104,yN-4,'N')+(one?'':ln(`${150+n*12},${yN} ${150+n*12},${190+n*10} ${262+n*22},${190+n*10} ${262+n*22},170`,B,1)+T(262+n*22,168,'N','middle')+dot(262+n*22,170,B));
 return h+T(10,262,'Solid = current path through the meter · dashed = voltage sense (high impedance)')+`</svg>`}
function mfHelp(c){
 if(mfCt(c))return mfHelpCt(c);
 if(!mfDlg){mfDlg=document.createElement('dialog');mfDlg.id='dVLH';mfDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))mfDlg.close()});document.body.appendChild(mfDlg)}
 mfDlg.innerHTML=`<h2>Multi-function meter – how it works &amp; how to wire it</h2>${mfDiag(mfPh(c)===1)}
  <h4>1. What it is</h4><p>A <b>multi-function meter</b> (MFM, power meter) measures a whole feeder at once: voltage, current, active power (kW), reactive power (kVAr), apparent power (kVA), power factor, frequency and energy (kWh). It is installed in the panel at the incomer of a motor, a feeder or the whole plant.</p>
  <h4>2. How to connect it</h4><ol><li>Put the meter <b>in series</b> with the load: supply → <b>I IN</b>, <b>I OUT</b> → load (the current flows through it, up to the rated ${c.p.I} A).</li><li>Connect <b>V1 / V2 / V3</b> to the same phases (and <b>N</b> to neutral) so the meter knows the voltage.</li><li>Press <b>▶ Run</b>. Click the display (or ◀ ▶) to step through the pages; the full table is in Properties.</li></ol>
  <h4>3. In this simulator</h4><ul><li>Works on DC, single-phase AC and three-phase AC (also with a VFD or motor behind it). Set <i>Wiring</i> to single-phase to use only I1 / V1 / N.</li><li><b>P</b> = Re(V·I*), <b>Q</b> = Im(V·I*), <b>S</b> = √(P²+Q²), <b>PF</b> = P / S.</li><li>Energy counts while the simulation runs. <i>Energy clock speed</i> 3600 makes one simulated second count as one hour – handy to watch kWh move. <i>Reset energy</i> clears the counters; Stop / Run also clears them.</li><li>Warnings: current above the direct rating, current with no voltage reference, reverse power.</li></ul>
  <div class=act><button class=pri data-x>Close</button></div>`;mfDlg.showModal()}

/* ================= CT / PT operated meters, current transformer and voltage transformer ================= */
/* The CT operated and CT + PT operated meters are the same component (Meter type in Properties).
   Projects saved by v8.8 used the separate types mfmc / mfmp – convert them when loading. */
function mfLegacy(c){if(c.type==='mfmc'||c.type==='mfmp'){c.p=c.p||{};c.p.typ=MFK[c.type==='mfmc'?1:2];c.type='mfm'}}

D.ct={n:'Current transformer (CT)',ds:'Current transformer, primary conductor through the core, 1 A or 5 A secondary (S1 / S2)',cat:'Instruments',pre:'CT',sx:18,sy:22,
 t:[[0,-40,'P1 (primary in)'],[0,40,'P2 (primary out)'],[40,-20,'S1 (secondary +)'],[40,20,'S2 (secondary −)']],bb:[-60,-46,106,92],
 p:{ip:[100,'A','Primary current (rated)'],is:[5,'A','Secondary current (rated)',['1','5']]},
 icon:`<path d="M0 -22V22" class=s /><circle r=11 class=s style="fill:#eef2f6" /><path d="M16 -14V-8a3 3 0 0 1 0 6a3 3 0 0 1 0 6a3 3 0 0 1 0 6V14" class=s /><text y=34 class=mt style="font-size:8px">CT</text>`,
 /* ideal CT: primary is a 0.1 mΩ series link; the secondary is a current source = primary current / ratio (from the previous solver pass), with a 1 kΩ leak so an open secondary shows its dangerous voltage */
 el:c=>[RR(0,1,1e-4),RR(2,3,1e3),{k:'I',a:3,b:2,i:c.s.sr||0,ii:c.s.si||0}],
 sim:(c,E)=>{const s=c.s,k=(+c.p.ip||1)/(+c.p.is||1),sr=E[0].cr/k,si=E[0].ci/k;let ch=0;
  if(Math.abs(sr-(s.sr||0))>1e-7||Math.abs(si-(s.si||0))>1e-7)ch=1;s.sr=sr;s.si=si;
  s.ipr=Math.hypot(E[0].cr,E[0].ci);s.isc=Math.hypot(sr,si);s.vsc=Math.hypot(E[1].vr,E[1].vi);return ch},
 fin:c=>{c.o={v:c.s.vsc||0,i:c.s.isc||0,p:0}},
 pn:c=>`${mfE(c.s.ipr||0,'A')} → ${mfE(c.s.isc||0,'A')}`,
 st:c=>`${mfE(c.s.ipr||0,'A')} primary → ${mfE(c.s.isc||0,'A')} secondary`,
 msg:c=>{const s=c.s,r=[];if(!S.run)return r;
  if(s.vsc>30&&s.isc>.01)r.push(['er',`${c.label}: CT SECONDARY OPEN OR NOT CONNECTED – ${s.vsc>999?(s.vsc/1e3).toFixed(1)+' kV':s.vsc.toFixed(0)+' V'} would appear on the terminals. Short S1–S2 or connect the meter.`]);
  if(s.ipr>1.2*c.p.ip)r.push(['wa',`${c.label}: primary current ${mfE(s.ipr,'A')} is above the CT rating of ${c.p.ip} A – the core would saturate`]);return r},
 help:c=>ctHelp('ct'),
 pp:c=>`<p class=mu>${S.run?`Primary <b>${mfE(c.s.ipr||0,'A')}</b> → secondary <b>${mfE(c.s.isc||0,'A')}</b> (ratio ${c.p.ip}/${c.p.is} A = ${((+c.p.ip)/(+c.p.is)).toFixed(0)}:1).`:'Press ▶ Run to see the secondary current.'}</p>
  <p class=mu><b>Wiring:</b> put the line through <b>P1 → P2</b> (P1 on the supply side). Connect <b>S1 / S2</b> to the meter's CT input of the same phase. <b>Never leave S1–S2 open while current flows</b>; short them if the meter is removed.</p>`,
 g:c=>{const run=!!S.run,s=c.s,hot=run&&(s.ipr||0)>1e-3;
  return`<path d="M0 -22V22" class=s /><circle r=14 class=s style="fill:${hot?'#fff4d6':'#eef2f6'}" /><path d="M0 -22V22" class=s /><circle cx=-8 cy=-17 r=2 class=f /><path d="M18 -20V-12a4 4 0 0 1 0 8a4 4 0 0 1 0 8a4 4 0 0 1 0 8V20" class=s /><circle cx=22 cy=-17 r=2 class=f />`+
   `<text x=-20 y=3 class=mt style="text-anchor:end;font-weight:700">${c.p.ip}/${c.p.is} A</text><text x=-20 y=-22 class=mt style="text-anchor:end;font-size:8px">P1</text><text x=-20 y=32 class=mt style="text-anchor:end;font-size:8px">P2</text>`+
   (run?`<text x=32 y=36 class=mt style="text-anchor:middle;font-size:9px;fill:${s.vsc>30&&s.isc>.01?'var(--er)':'var(--ok)'};font-weight:700">${mfE(s.isc||0,'A')}</text>`:'')}};

D.pt={n:'Voltage transformer (PT / VT)',ds:'Potential (voltage) transformer, primary high voltage, secondary e.g. 110 V for meters',cat:'Instruments',pre:'PT',
 t:[[-40,-20,'A (primary)'],[-40,20,'N / B (primary)'],[40,-20,'a (secondary)'],[40,20,'n (secondary)']],
 p:{vp:[11000,'V','Primary voltage (rated)'],vs:[110,'V','Secondary voltage (rated)'],va:[50,'VA','Rated burden']},
 icon:`<circle cx=-8 r=13 class=s /><circle cx=8 r=13 class=s /><text y=30 class=mt style="font-size:8px">PT</text>`,
 /* ideal PT: the secondary is a voltage source = primary phasor / ratio (angle kept), the primary is a high resistance Vp² / VA */
 el:c=>[RR(0,1,Math.max(10,c.p.vp*c.p.vp/Math.max(1,+c.p.va||1))),{k:'V',a:2,b:3,v:c.s.sv||0,ang:c.s.sa||0,hz:c.s.shz>0?c.s.shz:undefined}],
 sim:(c,E,X)=>{const s=c.s,e=E[0],k=(+c.p.vp||1)/(+c.p.vs||1),vm=Math.hypot(e.vr,e.vi),sv=vm/k,sa=Math.atan2(e.vi,e.vr)*180/Math.PI,f=Math.max(X.fq[e.na]||0,X.fq[e.nb]||0);let ch=0;
  if(Math.abs(sv-(s.sv||0))>1e-6*Math.max(1,sv)||Math.abs(sa-(s.sa||0))>1e-4||f!==(s.shz||0))ch=1;
  s.sv=sv;s.sa=sa;s.shz=f;s.vpr=vm;s.isec=Math.abs(E[1].cur);return ch},
 fin:c=>{c.o={v:c.s.sv||0,i:c.s.isec||0,p:0}},
 pn:c=>`${mfE(c.s.vpr||0,'V')} → ${mfE(c.s.sv||0,'V')}`,
 st:c=>`${mfE(c.s.vpr||0,'V')} primary → ${mfE(c.s.sv||0,'V')} secondary`,
 msg:c=>{const s=c.s,r=[];if(!S.run)return r;
  if(s.vpr>1.2*c.p.vp)r.push(['wa',`${c.label}: primary voltage ${mfE(s.vpr,'V')} is above the PT rating of ${c.p.vp} V`]);
  if((s.isec||0)*(s.sv||0)>1.1*c.p.va)r.push(['wa',`${c.label}: secondary burden ${((s.isec||0)*(s.sv||0)).toFixed(0)} VA exceeds the rated ${c.p.va} VA`]);return r},
 help:c=>ctHelp('pt'),
 pp:c=>`<p class=mu>${S.run?`Primary <b>${mfE(c.s.vpr||0,'V')}</b> → secondary <b>${mfE(c.s.sv||0,'V')}</b> (ratio ${((+c.p.vp)/(+c.p.vs)).toFixed(1)}:1).`:'Press ▶ Run to see the secondary voltage.'}</p>
  <p class=mu><b>Wiring:</b> primary <b>A</b> to the line, <b>N / B</b> to neutral (or to another line for a line-to-line PT). Secondary <b>a</b> to the meter's voltage terminal, <b>n</b> to the meter's N (and to earth). Use one PT per phase for a three-phase meter.</p>`,
 g:c=>`<circle cx=-9 r=16 class=s /><circle cx=9 r=16 class=s /><circle cx=-22 cy=-9 r=2 class=f /><circle cx=22 cy=-9 r=2 class=f /><text y=-26 class=mt style="font-weight:700;font-size:10px">${mfE(+c.p.vp,'V')} / ${mfE(+c.p.vs,'V')}</text>`};

/* ---- help for CT-operated meters and for the transformers ---- */
function mfDiagCt(pt){
 const T=(x,y,t,a,b)=>`<text x="${x}" y="${y}" text-anchor="${a||'start'}" style="font:${b?'700 ':''}11px Arial;fill:var(--tx)">${t}</text>`,
  dot=(x,y,c)=>`<circle cx="${x}" cy="${y}" r="3.5" fill="var(--pn)" stroke="${c}" stroke-width="1.5" />`,
  box=(x,y,w,h,t)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(--pn2)" stroke="var(--tx)" stroke-width="1.5" />`+T(x+w/2,y-6,t,'middle',1),
  ln=(p,c,d)=>`<polyline points="${p}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"${d?' stroke-dasharray="5 4"':''} />`,O='#d98400',B='#2f7fae',G='#12a36b';
 return`<svg viewBox="0 0 600 300" role="img" aria-label="CT and PT wiring">`+box(10,30,70,80,'Supply')+box(520,30,70,80,'Load')+
  ln('80,60 250,60',O)+ln('290,60 520,60',O)+T(84,54,'L1')+`<circle cx="270" cy="60" r="16" fill="var(--pn)" stroke="var(--tx)" stroke-width="2" />`+T(270,38,'CT','middle',1)+T(246,84,'P1','end')+T(298,84,'P2')+
  ln('80,95 520,95',B)+T(84,90,'N')+
  box(330,190,200,90,pt?'MFM – CT + PT':'MFM – CT operated')+dot(350,190,G)+T(350,208,'I1 S1','middle')+dot(380,190,G)+T(380,208,'I1 S2','middle')+
  ln('270,76 270,150 350,150 350,190',G)+T(274,140,'S1')+ln('278,72 300,72 300,160 380,160 380,190',G)+T(304,118,'S2')+
  (pt?box(130,150,70,60,'PT')+ln('150,60 150,150',O,1)+dot(150,60,O)+ln('180,95 180,150',B,1)+dot(180,95,B)+T(144,166,'A')+T(174,166,'N')+ln('150,210 150,240 440,240 440,190',O,1)+T(446,214,'V1')+dot(440,190,O)+ln('180,210 180,255 480,255 480,190',B,1)+T(486,214,'N')+dot(480,190,B)+T(14,288,'PT secondary a → V1, n → N · CT secondary S1 / S2 → I1 · repeat for L2 and L3'):
   ln('150,60 150,235 440,235 440,190',O,1)+dot(150,60,O)+T(446,214,'V1')+dot(440,190,O)+ln('180,95 180,250 480,250 480,190',B,1)+dot(180,95,B)+T(486,214,'N')+dot(480,190,B)+T(14,288,'CT secondary S1 / S2 → I1 S1 / I1 S2 · voltage taps to V1 / N · repeat for L2 and L3'))+`</svg>`}
function mfHelpCt(c){
 if(!mfDlg){mfDlg=document.createElement('dialog');mfDlg.id='dVLH';mfDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))mfDlg.close()});document.body.appendChild(mfDlg)}
 const pt=mfK(c)===2;
 mfDlg.innerHTML=`<h2>${pt?'CT + PT operated meter':'CT operated meter'} – how it works &amp; how to wire it</h2>${mfDiagCt(pt)}
  <h4>1. What it is</h4><p>On a large feeder the current is too big (and, on medium voltage, the voltage too high) for the meter to be connected directly. A <b>CT</b> (current transformer) turns, for example, 100 A into 5 A; ${pt?'a <b>PT</b> (voltage transformer) turns 6.35 kV into 63.5 V. ':''}The meter reads the small secondary signal and multiplies it by the ratios you set in its Properties, so the display shows the real primary values.</p>
  <h4>2. How to connect it</h4><ol><li>Pass each phase line through a <b>CT</b> (<b>P1</b> on the supply side). Connect CT <b>S1</b> to the meter <b>I S1</b> and the meter <b>I S2</b> back to CT <b>S2</b>, one pair per phase.</li><li>${pt?'Put one <b>PT</b> per phase between the line and neutral. PT secondary <b>a</b> goes to <b>V1 / V2 / V3</b>, all <b>n</b> terminals to the meter <b>N</b>.':'Connect <b>V1 / V2 / V3</b> straight to the three lines and <b>N</b> to neutral.'}</li><li>Set <b>CT primary / secondary</b>${pt?' and <b>PT primary / secondary</b>':''} in the meter's Properties to match the real transformers.</li></ol>
  <h4>3. In this simulator</h4><ul><li>The CT is an ideal current source on the secondary (primary ÷ ratio) and keeps the phase angle, so kW, kVAr and PF are correct. ${pt?'The PT keeps the voltage angle the same way.':''}</li><li><b>Wrong ratio in the meter = wrong readings</b> (a real commissioning error). The meter warns when the secondary current is above its ${c.p.cts} A input range.</li><li><b>Never open a CT secondary</b> while there is primary current: the simulator shows a danger message with the voltage that would appear. Short S1–S2 when you remove the meter.</li><li>Swapping S1 / S2 reverses the sign of the power – the meter warns about reverse power.</li></ul>
  <div class=act><button class=pri data-x>Close</button></div>`;mfDlg.showModal()}
function ctHelp(k){
 if(!mfDlg){mfDlg=document.createElement('dialog');mfDlg.id='dVLH';mfDlg.addEventListener('click',e=>{if(e.target.closest('[data-x]'))mfDlg.close()});document.body.appendChild(mfDlg)}
 mfDlg.innerHTML=k==='ct'?`<h2>Current transformer (CT)</h2><p>A CT has the line passing through it (<b>P1 → P2</b>) and a small secondary current on <b>S1 / S2</b>, proportional to the primary: <b>I secondary = I primary × (secondary rating ÷ primary rating)</b>. Standard secondary ratings are <b>5 A</b> and <b>1 A</b>.</p>
  <h4>How to wire it</h4><ol><li>Line in at <b>P1</b>, out at <b>P2</b>, in series with the load.</li><li><b>S1 / S2</b> to the CT input of an ammeter, a protection relay or a CT operated multi-function meter.</li></ol><h4>Safety</h4><ul><li>A CT secondary must <b>never be open</b> while the primary carries current – the secondary voltage rises to dangerous levels. The simulator shows an error with the voltage.</li><li>It is normal to short S1–S2 when nothing is connected.</li></ul><div class=act><button class=pri data-x>Close</button></div>`
 :`<h2>Voltage transformer (PT / VT)</h2><p>A PT scales a high voltage down to a safe, standard value (usually <b>110 V</b> or <b>63.5 V</b>) for meters and relays: <b>V secondary = V primary × (secondary rating ÷ primary rating)</b>. The phase angle is kept.</p>
  <h4>How to wire it</h4><ol><li>Primary <b>A</b> to the line, <b>N / B</b> to neutral (or to a second line for a line-to-line PT).</li><li>Secondary <b>a</b> to the meter voltage input, <b>n</b> to the meter neutral / earth. Use one PT per phase for three-phase.</li></ol><h4>Burden</h4><p>Each meter input draws a little power; the sum must stay below the PT's rated burden (VA). The simulator warns if it is exceeded.</p><div class=act><button class=pri data-x>Close</button></div>`;mfDlg.showModal()}
