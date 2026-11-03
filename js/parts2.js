/* ElectroSim v6 – extra parts: Fluke-style multimeter, signal injector (0-10 V / 4-20 mA), phase-failure relay,
   level rods (3 / 5 rod) and level controllers.  Loaded after registry.js.
   Hooks used by solver.js / app.js:  sim(c,E,X) → runs inside the solver loop (return true if a state changed)
   tk(c) per tick · st(c) status text · msg(c) warnings · fin(c) final c.o · clk(c,arg) click on a data-clk spot · pp(c) extra properties HTML */
'use strict';

/* ================= Multimeter ================= */
const dmmModes=['V AC','V DC','mV','Ω','Continuity','Diode','Hz','mA','A'];
const dmmMode=c=>dmmModes.includes(c.p.mode)?c.p.mode:'V DC';
const dmmFv=(v,u)=>{const a=Math.abs(v);return(v<-1e-9?'-':'')+(a<5e-4?'0.000 '+u:a<1?(a*1e3).toFixed(1)+' m'+u:a.toFixed(a<100?2:1)+' '+u)};
const dmmLcd=c=>{const m=dmmMode(c),s=c.s,v=s.rd;
 if(v==null||!S.run)return['---',''];
 switch(m){case'V AC':return[dmmFv(v,'V'),'AC'];case'V DC':return[dmmFv(v,'V'),'DC'];
  case'mV':return[Math.abs(v)>.6?'OL':(v*1e3).toFixed(1)+' mV','DC'];
  case'Ω':case'Continuity':return[fm(v,'Ω'),s.bp?'·))  BEEP':''];
  case'Diode':return[v>3?'OL':v.toFixed(3)+' V','->|'];
  case'Hz':return[v.toFixed(1)+' Hz','AC'];
  case'mA':return[(v<-1e-9?'-':'')+(Math.abs(v)*1e3).toFixed(2)+' mA',s.ac?'AC':'DC'];
  default:return[dmmFv(v,'A'),s.ac?'AC':'DC']}};

D.mltm={n:'Multimeter (Fluke-style DMM)',ds:'Digital multimeter with rotary mode switch (V AC/DC, mV, ohm, continuity, diode, Hz, mA, A)',cat:'Instruments',pre:'PM',sy:54,bb:[-56,-66,112,138],
 /* terminal order is kept from v5 (0 VΩ, 1 A, 2 COM) so saved projects still load; mA jack is index 3 */
 t:[[40,60,'VΩ','o'],[-40,60,'A (10 A)','o'],[20,60,'COM','o'],[-20,60,'mA','o']],
 p:{mode:['V DC','','Function (click the dial: left half = back, right half = forward)',dmmModes]},
 el:c=>{const m=dmmMode(c),vin=['V AC','V DC','mV','Hz'].includes(m);return[RR(0,2,vin?1e7:1e9),RR(1,2,c.s.fz?1e9:.001),RR(3,2,c.s.fm?1e9:5)]},
 clk:(c,a)=>{const n=dmmModes.length;c.p.mode=dmmModes[(dmmModes.indexOf(dmmMode(c))+(+a)+n)%n]},
 pp:()=>`<div class=row><button data-clk="-1">◀ Dial</button><button data-clk="1">Dial ▶</button></div><p class=mu>V / mV / Hz: VΩ + COM across the part (10 MΩ). Ω, Continuity, Diode: de-energised circuit only (the meter reads the dead network). mA / A: put the meter <b>in series</b> using the mA or A jack with COM. Leads left in a current jack with the dial on V make a short circuit and blow the meter fuse – like the real thing.</p>`,
 sim:(c,E,X)=>{const m=dmmMode(c),s=c.s,e=E[0],fq=X.fq,fa=k=>k>=0&&fq[k]>0,ac=fa(e.na)||fa(e.nb);let r=0,ch=0;s.bp=0;s.live=0;s.hint='';
  if(m==='V AC'){r=ac?Math.abs(e.v2):0;if(!ac&&Math.abs(e.v2)>1)s.hint='DC voltage present – turn the dial to V DC'}
  else if(m==='V DC'||m==='mV'){r=ac?0:e.v2;if(ac&&Math.abs(e.v2)>1)s.hint='AC voltage present – turn the dial to V AC'}
  else if(m==='Hz')r=ac?(fq[e.na]>0?fq[e.na]:fq[e.nb]):0;
  else if(m==='Ω'||m==='Continuity'){r=rmeas(X.els,X.n,e.na,e.nb);s.live=Math.abs(e.v2)>3;s.bp=m==='Continuity'&&r<30}
  else if(m==='Diode'){r=rmeas(X.els,X.n,e.na,e.nb,1);s.live=Math.abs(e.v2)>3}
  else{const j=m==='A'?E[1]:E[2],a=fa(j.na)||fa(j.nb);s.ac=a;r=a?Math.abs(j.cur):j.cur}
  if(Math.abs(E[1].cur)>11&&!s.fz){s.fz=1;ch=1}
  if(Math.abs(E[2].cur)>.44&&!s.fm){s.fm=1;ch=1}
  s.rd=r;return ch},
 st:c=>c.s.fz||c.s.fm?'FUSE BLOWN':dmmLcd(c).join(' ')+'  ['+dmmMode(c)+']',
 msg:c=>{const s=c.s,r=[];
  if(s.fz||s.fm)r.push(['wa',`${c.label}: meter fuse blown (${s.fz?'10 A':'mA'} jack overloaded) – replace it in properties`]);
  if(s.hint)r.push(['wa',`${c.label}: ${s.hint}`]);
  if(s.live)r.push(['wa',`${c.label}: ${dmmMode(c)} selected on a live circuit – de-energise first`]);return r},
 g:c=>{const m=dmmMode(c),i=dmmModes.indexOf(m),[dg,tg]=dmmLcd(c),T='fill:#222;font:700 7px Arial;text-anchor:middle',
  lab=['V~','V=','mV','Ω','·))','->|','Hz','mA','A'].map((l,k)=>{const a=(-120+30*k)*Math.PI/180;return`<text x="${(34*Math.sin(a)).toFixed(1)}" y="${(21-34*Math.cos(a)).toFixed(1)}" style="${T}${k===i?';fill:#c00':''}">${l}</text>`}).join('');
  return`<rect x="-48" y="-62" width="96" height="116" rx="10" style="fill:#f2c200;stroke:#2e2e2e;stroke-width:2"/><rect x="-40" y="-56" width="80" height="36" rx="3" style="fill:#c9d8a6;stroke:#2e2e2e;stroke-width:1.5"/>`+
   `<text x="36" y="-32" style="fill:#1b2a12;font:700 15px ui-monospace,Menlo,Consolas,monospace;text-anchor:end">${dg}</text>`+
   `<text x="-36" y="-46" style="fill:#1b2a12;font:700 7px Arial">${tg}</text><text x="36" y="-24" style="fill:#1b2a12;font:700 7px Arial;text-anchor:end">${m}</text>`+lab+
   `<circle cy="21" r="20" style="fill:#2b2b2b;stroke:#111;stroke-width:1.5"/><g transform="rotate(${-120+30*i} 0 21)"><path d="M0 21V6" style="stroke:#f2c200;stroke-width:3.5;stroke-linecap:round"/></g>`+
   `<path d="M0 1A20 20 0 0 0 0 41Z" data-clk="-1" style="fill:transparent;cursor:pointer"/><path d="M0 1A20 20 0 0 1 0 41Z" data-clk="1" style="fill:transparent;cursor:pointer"/>`+
   `<text x="-40" y="49" style="${T}">A</text><text x="-20" y="49" style="${T}">mA</text><text x="20" y="49" style="${T}">COM</text><text x="40" y="49" style="${T}">VΩ</text>`}};

/* ================= Signal injector (0-10 V / 4-20 mA) ================= */
const injModes=['0-10 V','4-20 mA source','4-20 mA simulate'];
D.inj={n:'Signal Injector (0-10 V / 4-20 mA)',ds:'Process signal injector / calibrator: 0-10 V, 4-20 mA source and 4-20 mA loop simulate',cat:'Instruments',pre:'SG',src:1,sy:54,bb:[-58,-66,116,138],
 t:[[-20,60,'+'],[20,60,'−'],[0,0,'*','h']],
 p:{mode:['0-10 V','','Output mode',injModes],val:[5,'V or mA','Output value']},
 el:c=>{const m=c.p.mode,mA=m!=='0-10 V',v=Math.max(0,Math.min(mA?24:10.5,+c.p.val||0)),L=c.s.lim,E=RR(0,1,1e9);
  if(!mA)return[E,L?{k:'I',a:1,b:0,i:.025*(c.s.ld||1)}:{k:'V',a:2,b:1,v},RR(0,2,L?1e9:1)];
  if(m==='4-20 mA source')return[E,L?{k:'V',a:0,b:1,v:24}:{k:'I',a:1,b:0,i:v/1e3},RR(0,2,1e9)];
  return[E,L?RR(0,1,3/Math.max(v/1e3,1e-6)):{k:'I',a:0,b:1,i:v/1e3},RR(0,2,1e9)]},
 /* output limits like a real calibrator: 25 mA on the volt range, 24 V compliance on the mA source, 3 V minimum loop voltage when simulating */
 sim:(c,E)=>{const p=c.p,s=c.s,m=p.mode,mA=m!=='0-10 V',v=Math.max(0,Math.min(mA?24:10.5,+p.val||0)),vt=E[0].v2,io=m==='4-20 mA simulate'?-E[1].cur:E[1].cur;let nl=s.lim?1:0;
  if(!mA){if(!s.lim&&Math.abs(io)>.0251){nl=1;s.ld=Math.sign(io)||1}else if(s.lim&&Math.abs(vt)>=v*.999)nl=0}
  else if(m==='4-20 mA source'){if(!s.lim&&Math.abs(vt)>24.01)nl=1;else if(s.lim&&Math.abs(io)>=v/1e3*.999)nl=0}
  else{if(!s.lim&&vt<3)nl=1;else if(s.lim&&vt>=3)nl=0}
  s.vo=vt;s.io=io;if(nl!==(s.lim?1:0)){s.lim=nl;return true}},
 fin:c=>{const s=c.s;c.o={v:s.vo||0,i:s.io||0,p:(s.vo||0)*(s.io||0)}},
 clk:(c,a)=>{const m=c.p.mode,mA=m!=='0-10 V',lo=mA?4:0,hi=mA?20:10;
  if(a==='m'){c.p.mode=injModes[(injModes.indexOf(m)+1)%3];c.p.val=c.p.mode==='0-10 V'?5:12;c.s.lim=0}
  else if(a==='+'||a==='-')c.p.val=Math.max(0,Math.min(mA?24:10.5,Math.round((+c.p.val+(a==='+'?.1:-.1))*100)/100));
  else c.p.val=lo+(hi-lo)*(+a)/100},
 pp:()=>`<div class=row><button data-clk="m">Next mode</button><button data-clk="-">− 0.1</button><button data-clk="+">+ 0.1</button></div><div class=row>${[0,25,50,75,100].map(q=>`<button data-clk="${q}">${q}%</button>`).join('')}</div><p class=mu>0 % / 100 % = 0 / 10 V or 4 / 20 mA. <b>mA source</b> drives the loop itself (24 V compliance). <b>mA simulate</b> acts like a 2-wire transmitter: it needs an external loop supply (+24 V → load → this device) and sets the loop current.</p>`,
 st:c=>{const s=c.s,m=c.p.mode,a=m==='0-10 V'?(s.vo||0).toFixed(2)+' V':(Math.abs(s.io||0)*1e3).toFixed(2)+' mA';
  return s.lim?(m==='0-10 V'?'CURRENT LIMIT 25 mA':m==='4-20 mA source'?'COMPLIANCE 24 V – loop open / too much load':'NO LOOP POWER'):'OUT '+a},
 g:c=>{const p=c.p,s=c.s,m=p.mode,mA=m!=='0-10 V',u=mA?'mA':'V',v=Math.max(0,Math.min(mA?24:10.5,+p.val||0)),run=S.run&&c.o,act=run?(mA?Math.abs(s.io||0)*1e3:s.vo||0):null,
  B=(x,y,w,a,t)=>`<rect x="${x}" y="${y}" width="${w}" height="13" rx="2" data-clk="${a}" style="fill:#dbe7f0;stroke:#173d57;cursor:pointer"/><text x="${x+w/2}" y="${y+9.5}" style="fill:#12293a;font:700 6.5px Arial;text-anchor:middle;pointer-events:none">${t}</text>`,
  lcd='fill:#1b2a12;text-anchor:end;font:700 7px Arial',J='fill:#fff;font:700 8px Arial;text-anchor:middle';
  return`<rect x="-52" y="-62" width="104" height="116" rx="9" style="fill:#2f7fae;stroke:#173d57;stroke-width:2"/><rect x="-44" y="-56" width="88" height="38" rx="3" style="fill:#c9d8a6;stroke:#173d57;stroke-width:1.5"/>`+
   `<text x="-40" y="-47" style="fill:#1b2a12;font:700 7px Arial">${mA?(m.includes('simulate')?'mA SIMULATE (2-wire)':'mA SOURCE'):'VOLT SOURCE'}</text>`+
   `<text x="40" y="-33" style="fill:#1b2a12;font:700 15px ui-monospace,Menlo,Consolas,monospace;text-anchor:end">${v.toFixed(2)} ${u}</text>`+
   `<text x="40" y="-22" style="${lcd}">${s.lim&&run?(mA?(m.includes('simulate')?'NO LOOP POWER':'COMPLIANCE'):'I LIMIT'):act!=null?'OUT '+act.toFixed(2)+' '+u:'SET VALUE'}</text>`+
   B(-44,-12,44,'m','MODE')+B(4,-12,18,'-','−')+B(26,-12,18,'+','+')+[0,25,50,75,100].map((q,i)=>B(-44+i*18,6,16,q,q+'%')).join('')+
   `<text y="34" style="${J}">SIGNAL INJECTOR</text><text x="-20" y="49" style="${J}">+</text><text x="20" y="49" style="${J}">−</text>`}};

/* ================= Phase failure / sequence relay ================= */
D.plr={n:'Phase Failure / Sequence Relay (3-ph)',ds:'3-phase monitoring relay: phase loss, asymmetry, under/over-voltage, phase sequence; 1 changeover output',cat:'Protection',pre:'KP',xr:1,sy:34,bb:[-40,-52,80,104],
 t:[[-20,-40,'L1'],[0,-40,'L2'],[20,-40,'L3'],[-20,40,'15','o'],[0,40,'16','o'],[20,40,'18','o']],
 p:{Un:[400,'V','Nominal voltage (L-L)'],uv:[80,'%','Under-voltage trip (% of Un)'],ov:[120,'%','Over-voltage trip (% of Un)'],as:[10,'%','Asymmetry trip'],sq:['Check','','Phase sequence',['Check','Ignore']],T:[1,'s','Trip delay']},
 cl:c=>!!c.s.en,
 el:c=>[RR(0,1,2e5),RR(1,2,2e5),RR(2,0,2e5),RR(3,5,c.s.en?.005:1e9),RR(3,4,c.s.en?1e9:.005)],
 pp:()=>'<p class=mu>Connect L1 L2 L3 to the 3-phase supply. Output relay (15-18 NO, 15-16 NC) pulls in 0.5 s after the phases are healthy and drops out after the trip delay on phase loss, asymmetry, under / over-voltage or wrong phase sequence. Name a contact after this relay\'s label (e.g. KP1) to use it in a control circuit.</p>',
 sim:(c,E)=>{const p=c.p,s=c.s,m=E.slice(0,3).map(q=>Math.hypot(q.vr,q.vi)),mx=Math.max(...m),mn=Math.min(...m),av=(m[0]+m[1]+m[2])/3,asy=av>1?(mx-mn)/av*100:0,sq=E[0].vr*E[1].vi-E[0].vi*E[1].vr<0;
  s.why=mx<.3*p.Un?'NO VOLTAGE':asy>Math.max(1,p.as)?(asy>50?'PHASE LOSS':'ASYMMETRY'):mn<p.Un*p.uv/100?'UNDERVOLTAGE':mx>p.Un*p.ov/100?'OVERVOLTAGE':p.sq==='Check'&&!sq?'PHASE SEQUENCE':'';
  s.good=!s.why;s.pa=asy},
 tk:c=>{const s=c.s;if(!!s.good!==!!s.en){s.tm=(s.tm||0)+DT;if(s.tm>=(s.good?.5:Math.max(.05,c.p.T))){s.en=s.good?1:0;s.tm=0}}else s.tm=0},
 st:c=>{const s=c.s;return s.en?(s.good?'HEALTHY – RELAY ON':'FAULT '+s.why+' – dropping out'):s.good?'STARTING…':'FAULT: '+(s.why||'')},
 msg:c=>c.s.why?[['wa',`${c.label}: ${c.s.why} (asymmetry ${(c.s.pa||0).toFixed(0)} %)`]]:[],
 g:c=>{const s=c.s,L=(t,x,y)=>`<text x="${x}" y="${y}" class="mt" style="font-size:8px">${t}</text>`;
  return`<rect x="-34" y="-34" width="68" height="68" rx="3" class="s"/><text y="-12" class="tx" style="font-size:11px">PHASE</text><text y="0" class="tx" style="font-size:11px">RELAY</text>`+
   `<circle cx="-14" cy="12" r="4" style="fill:${s.en?'var(--ok)':'#c8d3dc'};stroke:var(--w)"/><circle cx="14" cy="12" r="4" style="fill:${s.why?'var(--er)':'#c8d3dc'};stroke:var(--w)"/>`+
   ['L1','L2','L3'].map((n,i)=>L(n,-20+i*20,-27)).join('')+['15','16','18'].map((n,i)=>L(n,-20+i*20,31)).join('')}};

/* ================= Level rods (electrodes in a tank) ================= */
const rodPart=(nm,names,tips)=>{const n=names.length,xs=names.map((_,i)=>(i-(n-1)/2)*20),x0=xs[0]-14,w=xs[n-1]-xs[0]+28,ty=k=>54-88*k/100,p={lvl:[30,'%','Water level'],Rw:[3000,'Ω','Water resistance (rod to E)']};
 names.forEach((x,i)=>{if(i)p['h'+i]=[tips[i],'%',x+' rod tip height']});
 return{n:nm,ds:nm+' (conductive level probe set in a tank)',cat:'Sensors',pre:'LP',bb:[x0-6,-66,w+12,142],sy:34,
  t:names.map((x,i)=>[xs[i],-60,x,i?'o':undefined]),p,
  el:c=>names.slice(1).map((_,i)=>RR(0,i+1,(c.p.lvl>=c.p['h'+(i+1)]&&c.p.lvl>=5)?c.p.Rw:1e9)),
  clk:(c,a)=>{c.p.lvl=Math.max(0,Math.min(100,(+c.p.lvl||0)+(+a)))},
  pp:()=>'<div class=row><button data-clk="-5">Level −5 %</button><button data-clk="5">Level +5 %</button></div><p class=mu>E is the long reference rod (always wet above 5 %). A rod conducts to E through the water once the level reaches its tip. Wire the rods to a level controller, or to a PLC input.</p>',
  st:c=>'LEVEL '+Math.round(c.p.lvl)+' %',
  g:c=>{const lv=Math.max(0,Math.min(100,+c.p.lvl||0)),yw=ty(lv);let h=`<rect x="${x0}" y="-34" width="${w}" height="88" class="s"/><rect x="${x0+1}" y="${yw}" width="${w-2}" height="${54-yw}" style="fill:rgba(60,140,255,.35)"/>`;
   names.forEach((x,i)=>{const tp=i?c.p['h'+i]:5,wet=lv>=tp&&lv>=5;h+=`<path d="M${xs[i]} -34V${ty(tp)}" class="s" style="stroke-width:${i?2:3.5}"/><circle cx="${xs[i]}" cy="${ty(tp)}" r="2.5" style="fill:${wet?'var(--ok)':'#9aa7b3'};stroke:var(--w)"/><text x="${xs[i]+4}" y="${ty(tp)+3}" class="mt" style="font-size:7px;text-anchor:start">${x}</text>`});
   const B=(x,a,t)=>`<rect x="${x}" y="58" width="26" height="14" rx="3" data-clk="${a}" style="fill:#e3e9ef;stroke:var(--w);cursor:pointer"/><text x="${x+13}" y="68" class="tx" style="font-size:8px;pointer-events:none">${t}</text>`;
   return h+`<text y="${Math.max(-24,Math.min(44,yw-6))}" class="tx" style="font-size:11px">${Math.round(lv)}%</text>`+B(-30,-5,'−5%')+B(4,5,'+5%')}}};
D.lrod3=rodPart('Level Rods – 3-rod (E / L / H)',['E','L','H'],[0,35,70]);
D.lrod5=rodPart('Level Rods – 5-rod (E / LL / L / H / HH)',['E','LL','L','H','HH'],[0,15,35,65,85]);

/* ================= Level controllers (conductive probe relay) ================= */
const lvcPart=q=>{const o=q?7:5,tt=[[-60,-20,'A1'],[-60,20,'A2'],...(q?[[-40,-60,'E'],[-20,-60,'LL'],[0,-60,'L'],[20,-60,'H'],[40,-60,'HH']]:[[-20,-60,'E'],[0,-60,'L'],[20,-60,'H']]),
  [-20,60,'15','o'],[0,60,'16','o'],[20,60,'18','o'],...(q?[[60,-20,'25','o'],[60,20,'28','o']]:[])];
 return{n:`Level Controller – ${q?5:3}-rod`,ds:`Conductive level controller relay, ${q?5:3}-rod (pump control${q?', dry-run protection, high-level alarm':''})`,cat:'Control',pre:'KL',xr:1,sx:50,sy:40,bb:[-66,-66,132,132],t:tt,
  p:{V:[230,'V','Supply voltage (A1-A2)'],md:['Fill tank','','Control mode',['Fill tank','Empty tank']],Rs:[50,'kΩ','Sensitivity (max water resistance)']},
  cl:c=>!!c.s.en,
  el:c=>[RR(0,1,c.p.V*c.p.V/3),RR(o,o+2,c.s.en?.005:1e9),RR(o,o+1,c.s.en?1e9:.005),...(q?[RR(10,11,c.s.al?.005:1e9)]:[])],
  pp:()=>`<p class=mu><b>Fill tank:</b> relay (15-18) pulls in when the L rod goes dry and drops out when H is wet (pump-up). <b>Empty tank:</b> pulls in when H is wet, drops out when L is dry (pump-down).${q?' LL dry = dry-run lock-out (relay forced off); HH wet energises the alarm contact 25-28.':''} Name a contact after this label (e.g. KL1) to switch other circuits.</p>`,
  sim:(c,E,X)=>{const p=c.p,s=c.s,w=i=>rmeas(X.els,X.n,X.nd(i),X.nd(2))<p.Rs*1e3,pw=Math.abs(E[0].v2)>=.7*p.V;let en=!!s.en,al=false;s.dry=0;
   if(!pw)en=false;else{const wl=w(q?4:3),wh=w(q?5:4);if(p.md==='Fill tank'){if(!wl)en=true;if(wh)en=false}else{if(wh)en=true;if(!wl)en=false}
    if(q){if(!w(3)){en=false;s.dry=1}al=w(6)}}
   s.pw=pw;const ch=en!==!!s.en||al!==!!s.al;s.en=en;s.al=al;return ch},
  st:c=>{const s=c.s;return!s.pw?'NO SUPPLY':s.dry?'DRY RUN – RELAY OFF':(s.en?'RELAY ON':'RELAY OFF')+(s.al?' · HIGH ALARM':'')},
  g:c=>{const s=c.s;let h=`<rect x="-50" y="-40" width="100" height="80" rx="3" class="s"/><text y="-14" class="tx" style="font-size:11px">LEVEL CTRL</text><text y="-3" class="mt">${q?'5':'3'}-ROD · ${c.p.md==='Fill tank'?'FILL':'EMPTY'}</text>`+
   `<circle cx="-14" cy="10" r="4" style="fill:${s.pw?'var(--ok)':'#c8d3dc'};stroke:var(--w)"/><circle cx="14" cy="10" r="4" style="fill:${s.en?'var(--wa)':'#c8d3dc'};stroke:var(--w)"/><text x="-14" y="22" class="mt" style="font-size:7px">PWR</text><text x="14" y="22" class="mt" style="font-size:7px">RELAY</text>`;
   tt.forEach(([x,y,n])=>{const a=y<-40?[x,-33,'middle']:y>40?[x,35,'middle']:x<0?[-46,y+3,'start']:[46,y+3,'end'];h+=`<text x="${a[0]}" y="${a[1]}" class="mt" style="font-size:8px;text-anchor:${a[2]}">${n}</text>`});
   return h+(q&&s.al?'<text x="34" y="14" class="mt" style="fill:var(--er);font-weight:700;font-size:8px">ALARM</text>':'')}}};
D.lvc3=lvcPart(0);D.lvc5=lvcPart(1);
