/* ElectroSim v8.20 – HMI process graphics (phase 3). Loaded after hmi.js and before hmid.js.
   SYMBOLS    widget kind 'sym', item.sy = tank | pump | valve | motor | fan | pipe | conv | tower | gauge | meter
              a = main address (level / value for tank, gauge, meter; running / open / flow bit for the others), a2 = fault bit, tower: a / a2 / a3 = red / amber / green lamp
   ANIMATION  any widget may carry item.an = [{t,a,…}] rules, applied in order (later rules win):
              col {on,off} colour names · blink {r:'slow'|'fast'} · vis {m:'show'|'hide'} · fill {mn,mx,fd,on} · rot {sp deg/s} · mov {dx,dy,mn,mx}
              A rule is "on" when its address is a bit = 1, a timer / counter that is done / non-zero, or an analog value > 0.
   LIMITS     num, bar, tank, gauge, meter and trend: item.ll / lw / hw / hh (low alarm, low warning, high warning, high alarm). Amber at a warning, red at an alarm.
   TREND      widget kind 'trend': item.pens = [{a,c}] (max 4), item.ts = time span in s, item.yn / yx = Y range (empty = auto). Samples are taken every 0.1 s of
              simulation time while the PLC runs. The on-screen buttons change the time scale (− / +), pause (⏸) and, when paused, scroll (◀ ▶).
   Runtime state (animation angles, trend samples) lives in HR, never in the saved project; it is cleared by ■ Stop (hmiReset). */
'use strict';
const HR=new WeakMap();
const HTRS=[10,30,60,120,300,600,1800,3600],HTRM=4,HTRI=.1;
const HSYC={off:'#56606a',flt:'#d64545',fltD:'#7a2a2a',glass:'#0a131b',line:'#8fb3cf',txt:'#cfe3f1',met:'#6b7a88'};
const HSYM={
 tank :{n:'Tank',w:90,h:130,c:'Cyan',l:'TANK',val:1,ad:[['a','Level (AI0, AO0, T0 …)','AI0']]},
 pump :{n:'Pump',w:76,h:80,c:'Green',l:'PUMP',sp:360,ad:[['a','Running bit','Q0.0'],['a2','Fault bit (optional)','M1.0']]},
 valve:{n:'Valve',w:70,h:64,c:'Green',l:'VALVE',ad:[['a','Open bit (or position AI / AO)','Q0.1'],['a2','Fault bit (optional)','M1.1']]},
 motor:{n:'Motor',w:76,h:80,c:'Green',l:'MOTOR',sp:360,ad:[['a','Running bit','Q0.0'],['a2','Fault bit (optional)','M1.0']]},
 fan  :{n:'Fan',w:76,h:80,c:'Green',l:'FAN',sp:540,ad:[['a','Running bit','Q0.2'],['a2','Fault bit (optional)','M1.2']]},
 pipe :{n:'Pipe',w:160,h:16,c:'Cyan',l:'',sp:40,ad:[['a','Flow bit (or flow AI / AO)','Q0.0']]},
 conv :{n:'Conveyor',w:220,h:56,c:'Green',l:'CONVEYOR',sp:40,ad:[['a','Running bit','Q0.3'],['a2','Fault bit (optional)','M1.3']]},
 tower:{n:'Tower lamp',w:40,h:124,c:'Green',l:'',ad:[['a','Red lamp bit','Q0.4'],['a2','Amber lamp bit','Q0.5'],['a3','Green lamp bit','Q0.6']]},
 gauge:{n:'Gauge',w:116,h:128,c:'Green',l:'PRESSURE',val:1,ad:[['a','Value (AI0, AO0, T0 …)','AI0']]},
 meter:{n:'Meter',w:132,h:100,c:'Cyan',l:'CURRENT',val:1,ad:[['a','Value (AI0, AO0, T0 …)','AI0']]}};
const HSYI={tank:'<rect x=5 y=2 width=10 height=16 rx=2 /><path d="M5 10h10"/>',pump:'<circle cx=9 cy=11 r=6 /><path d="M9 5V2h5M6 9l3 2 3-2M9 11v4"/>',valve:'<path d="M2 6l8 5-8 5zM18 6l-8 5 8 5zM10 11V4"/>',
 motor:'<circle cx=10 cy=10 r=7.5 /><path d="M6.5 13V7l3.5 4 3.5-4v6"/>',fan:'<circle cx=10 cy=10 r=8 /><path d="M10 10c0-5 3-5 3-3M10 10c5 0 5 3 3 3M10 10c0 5-3 5-3 3M10 10c-5 0-5-3-3-3"/>',
 pipe:'<rect x=1 y=7 width=18 height=6 /><path d="M5 10h3M11 10h3"/>',conv:'<rect x=2 y=7 width=16 height=8 rx=4 /><path d="M7 4h2M11 4h2"/>',tower:'<rect x=7 y=2 width=6 height=5 /><rect x=7 y=7 width=6 height=5 /><rect x=7 y=12 width=6 height=5 /><path d="M5 18h10"/>',
 gauge:'<path d="M3.5 15A8 8 0 1 1 16.5 15"/><path d="M10 11l3-4"/>',meter:'<rect x=2 y=4 width=16 height=12 rx=2 /><path d="M5 12a6 6 0 0 1 10 0M10 13l2-5"/>',trend:'<path d="M2 3v14h16M4 13l4-5 3 3 5-7"/>'};

/* ---------------- small helpers ---------------- */
const hmipDemo=c=>!!(HD&&HD.c===c&&HD.mode==='design');                 /* designer, Design tab: show sample values */
const hmipRun=()=>S.run&&!S.pause;
const hmipN=v=>v===''||v==null||!Number.isFinite(+v)?null:+v;
const hmipOn=r=>!!(r&&(r.b!=null?r.b:r.n>0));
const hmipNum=r=>r?(r.n!=null?r.n:r.b?1:0):null;
const hmipBl=ms=>Math.floor(Date.now()/ms)%2===0;                        /* true in the "on" half of a blink period */
const hmipCl=(v,a,b)=>Math.max(a,Math.min(b,v));
const hmipLv=(r,ad)=>!r?0:/^A[IO]/.test(ad)?hmipCl(r.n/100,0,1):hmipOn(r)?1:0;
const hmipEase=(cur,tg,dt,tau)=>cur+(tg-cur)*(1-Math.exp(-dt/tau));
function hmipRt(c){let o=HR.get(c);if(!o){o={an:{},tr:{}};HR.set(c,o)}return o}
const hmipSt=(c,k)=>{const o=hmipRt(c).an;return o[k]||(o[k]={})};
function hmipDt(st){const n=performance.now();if(st.t==null){st.t=n;return 0}const d=n-st.t;if(d<4)return 0;st.t=n;return hmipRun()?Math.min(d,100)/1000:0}
function hmipReset(c){HR.delete(c)}                                       /* called by hmiReset() on ■ Stop */
const hmipClone=o=>JSON.parse(JSON.stringify(o));
function hmipInit(n,sy){if(n.k==='trend'){Object.assign(n,{w:320,h:180,c:'Cyan',l:'TREND',fs:11,ts:60,yn:0,yx:100,pens:[{a:'',c:'Cyan'}]});return n}
 const M=HSYM[sy]||HSYM.tank;n.sy=HSYM[sy]?sy:'tank';Object.assign(n,{w:M.w,h:M.h,c:M.c,l:M.l,fs:11,mn:0,mx:100});if(M.sp)n.sp=M.sp;if(sy==='tower'){n.m1=n.m2=n.m3='steady'}return n}

/* ---------------- value limits: amber at a warning, red at an alarm ---------------- */
function hmipLim(it,v){if(!Number.isFinite(v))return null;const ll=hmipN(it.ll),lw=hmipN(it.lw),hw=hmipN(it.hw),hh=hmipN(it.hh);let l=0;
 if((ll!=null&&v<=ll)||(hh!=null&&v>=hh))l=2;else if((lw!=null&&v<=lw)||(hw!=null&&v>=hw))l=1;
 return l?{lvl:l,c:l===2?HCOL.Red:HCOL.Amber}:null}
/* colour to draw a value in: limit colour (blinking at an alarm when asked) or the widget colour */
function hmipVC(it,v,base){const m=hmipLim(it,v);if(!m)return base;return m.lvl===2&&it.lb&&!hmipBl(400)?base:m.c}
/* limit ticks on a bar / tank: [fraction, colour] */
const hmipMarks=(it,mn,mx)=>['ll','lw','hw','hh'].map(k=>[hmipN(it[k]),k==='ll'||k==='hh'?HCOL.Red:HCOL.Amber]).filter(q=>q[0]!=null&&q[0]>mn&&q[0]<mx).map(q=>[(q[0]-mn)/(mx-mn),q[1]]);
function hmipFmt(it,r,v){const dp=it.dp===''||it.dp==null?(r&&r.u==='s'?1:0):+it.dp;return v.toFixed(dp)+(r&&r.u==='%'?' %':r&&r.u==='s'?' s':'')}

/* ---------------- animation rules ---------------- */
function hmipAnim(c,it){const A={hide:0,col:null,op:1,dx:0,dy:0,rot:0,fill:''},R=it.an;if(!R||!R.length||hmipDemo(c))return A;
 R.forEach((q,i)=>{const ad=hmiAd(q.a);if(!ad)return;const r=hmiRead(c,ad),on=hmipOn(r),isB=HBIT.test(ad),st=hmipSt(c,it.id+'|'+i),dt=hmipDt(st);
  const lo=hmipN(q.mn),hi=hmipN(q.mx),mn=lo==null?0:lo,mx=hi==null?(isB?1:100):hi,v=r?(isB?(on?mx:mn):hmipNum(r)):mn,f=hmipCl((v-mn)/((mx-mn)||1),0,1);
  if(q.t==='col'){const k=on?q.on:q.off;if(k)A.col=k}
  else if(q.t==='blink'){if(on&&!hmipBl(q.r==='fast'?250:500))A.op=Math.min(A.op,.2)}
  else if(q.t==='vis'){if((q.m==='hide')===on)A.hide=1}
  else if(q.t==='rot'){st.s=hmipEase(st.s||0,(+q.sp||0)*hmipLv(r,ad),dt,.6);if(Math.abs(st.s)<.3)st.s=0;st.a=((st.a||0)+st.s*dt)%360;A.rot+=st.a}
  else if(q.t==='mov'){st.f=st.f==null?f:hmipEase(st.f,f,dt,.25);A.dx+=st.f*(+q.dx||0);A.dy+=st.f*(+q.dy||0)}
  else if(q.t==='fill'){st.f=st.f==null?f:hmipEase(st.f,f,dt,.3);const{x,y,w,h}=it,p=st.f,d=q.fd||'up',
    b=d==='right'?[x,y,w*p,h]:d==='left'?[x+w*(1-p),y,w*p,h]:d==='down'?[x,y,w,h*p]:[x,y+h*(1-p),w,h*p];
   A.fill+=`<rect x=${b[0]} y=${b[1]} width=${Math.max(0,b[2])} height=${Math.max(0,b[3])} rx=4 style="fill:${hmiCol(q.on||it.c)};opacity:.5;pointer-events:none"/>`}});
 return A}

/* ---------------- symbols ---------------- */
const hmipRect=(x,y,w,h)=>`<rect x=${x} y=${y} width=${w} height=${h} style="fill:transparent"/>`;
const hmipTx=(x,y,s,st,t)=>`<text x=${x} y=${y} style="font:600 ${s}px Arial,sans-serif;pointer-events:none;${st}">${t}</text>`;
function hmipArc(cx,cy,r,a0,a1){const p=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)],s=p(a0),e=p(a1);return`M${s[0].toFixed(1)} ${s[1].toFixed(1)}A${r} ${r} 0 ${a1-a0>180?1:0} 1 ${e[0].toFixed(1)} ${e[1].toFixed(1)}`}
/* coloured zones of a dial between fractions: [[f0,f1,colour]] */
function hmipZones(it,mn,mx,base){const f=k=>{const v=hmipN(it[k]);return v==null?null:hmipCl((v-mn)/(mx-mn),0,1)},ll=f('ll'),lw=f('lw'),hw=f('hw'),hh=f('hh'),Z=[];
 Z.push([Math.max(ll||0,lw||0),Math.min(hw==null?1:hw,hh==null?1:hh),base]);
 if(ll!=null)Z.push([0,ll,HCOL.Red]);if(lw!=null)Z.push([ll||0,lw,HCOL.Amber]);
 if(hw!=null)Z.push([hw,hh==null?1:hh,HCOL.Amber]);if(hh!=null)Z.push([hh,1,HCOL.Red]);
 return Z.filter(z=>z[1]>z[0]+.001)}

function hmipSym(c,it,clk){const{x,y,w,h}=it,sy=HSYM[it.sy]?it.sy:'tank',M=HSYM[sy],lab=esc(it.l==null?'':it.l),fs=+it.fs||11,lh=lab?fs+6:0,H=Math.max(16,h-lh),cx=x+w/2,cy=y+H/2,
 demo=hmipDemo(c),ad=hmiAd(it.a),r=demo?null:hmiRead(c,ad),flt=demo?0:hmipOn(hmiRead(c,it.a2)),on=hmipOn(r),col=hmiCol(it.c),
 st=hmipSt(c,it.id+'|s'),dt=hmipDt(st),mn=hmipN(it.mn)==null?0:+it.mn,mxv=hmipN(it.mx),mx=mxv==null||mxv===mn?mn+100:mxv,
 bc=flt?(hmipBl(400)?HSYC.flt:HSYC.fltD):on?col:HSYC.off,sp=+it.sp||M.sp||0,Rr=Math.min(w,H)/2-4;
 let g=hmipRect(x,y,w,h),v=null;
 /* value symbols: eased value */
 if(M.val){v=demo?mn+(mx-mn)*.62:r?hmipNum(r):null;const tg=v==null?0:hmipCl((v-mn)/(mx-mn),0,1);st.f=st.f==null?tg:hmipEase(st.f,tg,dt,.35)}
 /* spinning / flowing symbols: eased speed fraction and angle / phase */
 else{const lv=demo||flt?0:hmipLv(r,ad);st.s=hmipEase(st.s||0,lv,dt,.7);if(st.s<.003)st.s=0;const dir=it.fd==='rev'?-1:1;
  st.a=((st.a||0)+st.s*dt*sp*(sy==='pipe'||sy==='conv'?0:1))%360;st.p=((st.p||0)+st.s*dt*sp*dir)%100000}
 if(sy==='tank'){const f=st.f,bx=x+8,bw=w-16,top=y+6,bot=y+H-4,ih=bot-top,vc=hmipVC(it,v,col),lv=top+ih*(1-f),rr=Math.min(10,bw*.2);
  g+=`<path d="M${bx} ${top}V${bot-rr}Q${bx} ${bot} ${bx+rr} ${bot}H${bx+bw-rr}Q${bx+bw} ${bot} ${bx+bw} ${bot-rr}V${top}" style="fill:${HSYC.glass};stroke:${HSYC.line};stroke-width:2.2"/>`;
  if(f>.002)g+=`<path d="M${bx+2} ${lv}V${bot-rr}Q${bx+2} ${bot-2} ${bx+rr} ${bot-2}H${bx+bw-rr}Q${bx+bw-2} ${bot-2} ${bx+bw-2} ${bot-rr}V${lv}Z" style="fill:${vc};opacity:.85"/><rect x=${bx+2} y=${lv} width=${bw-4} height=2 style="fill:#fff;opacity:.5"/>`;
  [.25,.5,.75].forEach(q=>{g+=`<path d="M${bx} ${top+ih*q}h6" style="stroke:${HSYC.line};stroke-width:1"/>`});
  hmipMarks(it,mn,mx).forEach(m=>{const yy=bot-ih*m[0];g+=`<polygon points="${bx+bw+1},${yy} ${bx+bw+7},${yy-4} ${bx+bw+7},${yy+4}" style="fill:${m[1]}"/>`});
  g+=hmipTx(cx,top+ih/2+5,Math.min(16,bw*.26),'fill:#fff;text-anchor:middle;paint-order:stroke;stroke:rgba(0,0,0,.55);stroke-width:2.5px',v==null?'--':hmipFmt(it,r,v))}
 else if(sy==='pump'){g+=`<rect x=${cx-Rr-9} y=${cy-Rr*.22} width=12 height=${Rr*.44} style="fill:${HSYC.met}"/><rect x=${cx+Rr*.1} y=${cy-Rr-8} width=${Rr*.55} height=12 style="fill:${HSYC.met}"/>`+
  `<circle cx=${cx} cy=${cy} r=${Rr} style="fill:${bc};stroke:rgba(255,255,255,.55);stroke-width:2"/><g transform="rotate(${st.a.toFixed(1)} ${cx} ${cy})" style="stroke:#0b1620;stroke-width:3.2;stroke-linecap:round;opacity:.75">`+
  [0,120,240].map(a=>`<path d="M${cx} ${cy}L${cx+Rr*.72*Math.cos(a*Math.PI/180)} ${cy+Rr*.72*Math.sin(a*Math.PI/180)}"/>`).join('')+`</g><circle cx=${cx} cy=${cy} r=${Rr*.16} style="fill:#fff"/>`}
 else if(sy==='motor'){g+=`<rect x=${cx+Rr-2} y=${cy-5} width=12 height=10 style="fill:${HSYC.met}"/><rect x=${cx-Rr*.75} y=${cy+Rr-3} width=${Rr*1.5} height=6 rx=2 style="fill:${HSYC.met}"/>`+
  `<circle cx=${cx} cy=${cy} r=${Rr} style="fill:${bc};stroke:rgba(255,255,255,.55);stroke-width:2"/><g transform="rotate(${st.a.toFixed(1)} ${cx} ${cy})" style="stroke:rgba(0,0,0,.45);stroke-width:2.4;stroke-linecap:round">`+
  [0,60,120,180,240,300].map(a=>`<path d="M${cx+Rr*.62*Math.cos(a*Math.PI/180)} ${cy+Rr*.62*Math.sin(a*Math.PI/180)}L${cx+Rr*.88*Math.cos(a*Math.PI/180)} ${cy+Rr*.88*Math.sin(a*Math.PI/180)}"/>`).join('')+`</g>`+
  `<circle cx=${cx} cy=${cy} r=${Rr*.5} style="fill:${HSYC.glass}"/>`+hmipTx(cx,cy+Rr*.2,Rr*.6,'fill:#fff;text-anchor:middle','M')}
 else if(sy==='fan'){g+=`<circle cx=${cx} cy=${cy} r=${Rr} style="fill:${HSYC.glass};stroke:${flt?bc:HSYC.line};stroke-width:2.5"/><g transform="rotate(${st.a.toFixed(1)} ${cx} ${cy})">`+
  [0,90,180,270].map(a=>`<ellipse cx=${cx} cy=${cy-Rr*.48} rx=${Rr*.22} ry=${Rr*.44} transform="rotate(${a} ${cx} ${cy}) rotate(18 ${cx} ${cy-Rr*.48})" style="fill:${bc};opacity:.92"/>`).join('')+`</g><circle cx=${cx} cy=${cy} r=${Rr*.14} style="fill:#fff"/>`}
 else if(sy==='valve'){const bw=w-10,bh=Math.min(H*.5,bw*.62),vy=y+H-bh/2-3,x0=x+5,x1=x+w-5,ty=y+H*.2,rd=Math.min(13,w*.2),ps=r&&r.u==='%'?r.n:null;
  g+=`<path d="M${cx} ${vy}V${ty}" style="stroke:${HSYC.met};stroke-width:3"/><path d="M${cx-rd} ${ty}a${rd} ${rd} 0 0 1 ${rd*2} 0Z" style="fill:${HSYC.met}"/>`+
   `<polygon points="${x0},${vy-bh/2} ${cx},${vy} ${x0},${vy+bh/2}" style="fill:${bc};stroke:rgba(255,255,255,.55);stroke-width:1.5"/><polygon points="${x1},${vy-bh/2} ${cx},${vy} ${x1},${vy+bh/2}" style="fill:${bc};stroke:rgba(255,255,255,.55);stroke-width:1.5"/>`+
   (ps!=null?hmipTx(cx+rd+4,ty,Math.max(9,fs-1),'fill:'+HSYC.txt,Math.round(ps)+' %'):'')}
 else if(sy==='pipe'){const hz=w>=h,T=hz?h:w,fl=st.s>.02;
  g+=`<rect x=${x} y=${y} width=${w} height=${h} rx=${T/3} style="fill:#3a4652;stroke:#1b2a38;stroke-width:1"/>`+
   (hz?`<rect x=${x+2} y=${y+3} width=${w-4} height=${h-6} style="fill:${fl?col:'#0f1a24'}"/>`:`<rect x=${x+3} y=${y+2} width=${w-6} height=${h-4} style="fill:${fl?col:'#0f1a24'}"/>`);
  if(fl)g+=`<path d="${hz?`M${x+2} ${cy}H${x+w-2}`:`M${x+w/2} ${y+2}V${y+h-2}`}" style="stroke:#fff;opacity:${(.15+.4*st.s).toFixed(2)};stroke-width:${Math.max(2,T*.34)};stroke-dasharray:6 12;stroke-dashoffset:${(-st.p).toFixed(1)};fill:none"/>`;}
 else if(sy==='conv'){const bh=H*.5,by=y+H*.3,rr=bh/2,bt=flt?(hmipBl(400)?HSYC.flt:HSYC.fltD):'#2b3744',run=w-2*rr-14;
  g+=`<rect x=${x+2} y=${by} width=${w-4} height=${bh} rx=${rr} style="fill:${bt};stroke:${HSYC.line};stroke-width:1.6"/>`+
   `<path d="M${x+rr+2} ${by+bh*.5}H${x+w-rr-2}" style="stroke:${on&&!flt?col:HSYC.off};stroke-width:3;stroke-dasharray:10 10;stroke-dashoffset:${(-st.p).toFixed(1)};opacity:.9;fill:none"/>`;
  [x+rr+2,x+w-rr-2].forEach(px=>{g+=`<circle cx=${px} cy=${by+bh/2} r=${rr*.62} style="fill:#1b2a38;stroke:${HSYC.met};stroke-width:2"/><g transform="rotate(${(st.p*3).toFixed(0)} ${px} ${by+bh/2})" style="stroke:${HSYC.met};stroke-width:2"><path d="M${px-rr*.5} ${by+bh/2}h${rr}M${px} ${by+bh/2-rr*.5}v${rr}"/></g>`});
  [0,1,2].forEach(i=>{const px=x+rr+7+(((st.p*1.2+i*run/3)%run)+run)%run;g+=`<rect x=${px-7} y=${by-11} width=14 height=12 rx=2 style="fill:${col};stroke:rgba(0,0,0,.45);stroke-width:1"/>`})}
 else if(sy==='tower'){const lw=Math.min(w*.8,40),lh2=(H-12)/3,lx=cx-lw/2,L=[['a','m1','#d64545','#3a1d1d'],['a2','m2','#e0a020','#3b3118'],['a3','m3','#2fa05a','#15301f']];
  g+=`<rect x=${cx-3} y=${y+H-12} width=6 height=8 style="fill:${HSYC.met}"/><rect x=${cx-lw/2-3} y=${y+H-6} width=${lw+6} height=5 rx=2 style="fill:${HSYC.met}"/>`;
  L.forEach((q,i)=>{let lit=demo?i===2:hmipOn(hmiRead(c,it[q[0]]));const m=it[q[1]]||'steady';if(lit&&m!=='steady'&&!hmipBl(m==='fast'?250:500))lit=false;const ly=y+2+i*lh2;
   g+=(lit?`<rect x=${lx-4} y=${ly-3} width=${lw+8} height=${lh2+4} rx=8 style="fill:${q[2]};opacity:.28"/>`:'')+`<rect x=${lx} y=${ly} width=${lw} height=${lh2-2} rx=6 style="fill:${lit?q[2]:q[3]};stroke:rgba(255,255,255,.4);stroke-width:1"/>`+(lit?`<rect x=${lx+4} y=${ly+3} width=${lw-8} height=${(lh2-2)*.28} rx=3 style="fill:#fff;opacity:.35"/>`:'')})}
 else if(sy==='gauge'){const R=Math.min(w,H)/2-3,ra=R*.8,f=st.f,vc=hmipVC(it,v,col),th=R*.13;
  g+=`<circle cx=${cx} cy=${cy} r=${R} style="fill:${HSYC.glass};stroke:#35516a;stroke-width:3"/><path d="${hmipArc(cx,cy,ra,135,405)}" style="fill:none;stroke:#1b2a38;stroke-width:${th}"/>`;
  hmipZones(it,mn,mx,col).forEach(z=>{g+=`<path d="${hmipArc(cx,cy,ra,135+270*z[0],135+270*z[1])}" style="fill:none;stroke:${z[2]};stroke-width:${th};opacity:.9"/>`});
  for(let i=0;i<=10;i++){const a=(135+27*i)*Math.PI/180,r1=ra-th*.8,r2=ra-th*(i%5?1.5:2.2);g+=`<path d="M${cx+r1*Math.cos(a)} ${cy+r1*Math.sin(a)}L${cx+r2*Math.cos(a)} ${cy+r2*Math.sin(a)}" style="stroke:${HSYC.txt};stroke-width:${i%5?1:1.8}"/>`}
  const na=(135+270*f)*Math.PI/180;
  g+=hmipTx(cx-ra*.72,cy+R*.88,Math.max(8,R*.15),'fill:#8fb3cf;text-anchor:middle',String(mn))+hmipTx(cx+ra*.72,cy+R*.88,Math.max(8,R*.15),'fill:#8fb3cf;text-anchor:middle',String(mx))+
   `<path d="M${cx} ${cy}L${cx+ra*.78*Math.cos(na)} ${cy+ra*.78*Math.sin(na)}" style="stroke:#fff;stroke-width:${Math.max(2,R*.045)};stroke-linecap:round"/><circle cx=${cx} cy=${cy} r=${R*.09} style="fill:#fff"/>`+
   hmipTx(cx,cy+R*.52,Math.max(10,R*.22),'text-anchor:middle;font-family:ui-monospace,Consolas,monospace;fill:'+vc,v==null?'--':hmipFmt(it,r,v))}
 else if(sy==='meter'){const py=y+H*.9,ra=Math.min(w*.4,H*.78),f=st.f,vc=hmipVC(it,v,'#10202b'),a0=225,a1=315,th=5,pt=(a,rr2)=>[cx+rr2*Math.cos(a*Math.PI/180),py+rr2*Math.sin(a*Math.PI/180)];
  g+=`<rect x=${x+1} y=${y+1} width=${w-2} height=${H-2} rx=6 style="fill:#e4eaef;stroke:#35516a;stroke-width:2"/><path d="${hmipArc(cx,py,ra,a0,a1)}" style="fill:none;stroke:#9aa7b2;stroke-width:${th}"/>`;
  hmipZones(it,mn,mx,'#2b3744').forEach(z=>{g+=`<path d="${hmipArc(cx,py,ra,a0+90*z[0],a0+90*z[1])}" style="fill:none;stroke:${z[2]};stroke-width:${th}"/>`});
  for(let i=0;i<=10;i++){const a=a0+9*i,p1=pt(a,ra-th),p2=pt(a,ra-th-(i%5?4:8));g+=`<path d="M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}" style="stroke:#10202b;stroke-width:${i%5?1:1.6}"/>`}
  const pn=pt(a0+90*f,ra-2);g+=`<path d="M${cx} ${py}L${pn[0]} ${pn[1]}" style="stroke:#c0392b;stroke-width:2;stroke-linecap:round"/><circle cx=${cx} cy=${py} r=4 style="fill:#10202b"/>`+
   hmipTx(cx,y+H*.52,Math.max(10,H*.17),'text-anchor:middle;font-family:ui-monospace,Consolas,monospace;fill:'+vc,v==null?'--':hmipFmt(it,r,v))+hmipTx(x+7,y+14,9,'fill:#4d5b67',String(mn))+hmipTx(x+w-7,y+14,9,'fill:#4d5b67;text-anchor:end',String(mx))}
 if(lab)g+=hmipTx(cx,y+h-3,fs,'fill:'+HSYC.txt+';text-anchor:middle',lab);
 return g}

/* ---------------- trend chart ---------------- */
function hmipTr(c,it){const o=hmipRt(c).tr;return o[it.id]||(o[it.id]={t:[],v:[[],[],[],[]],last:null,pause:null,off:0,span:null})}
const hmipTs=s=>s<60?Math.round(s)+' s':Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
/* sampling, called by hmiWrite() each PLC scan: one point every 0.1 s of simulation time for every trend of the panel (also on screens not shown) */
function hmipSample(h,pl){const t=S.time;hmiDesign(h).screens.forEach(s=>s.items.forEach(it=>{if(it.k!=='trend'||!it.pens)return;const st=hmipTr(h,it);
  if(st.last!=null&&t<st.last){st.t.length=0;st.v.forEach(a=>a.length=0);st.last=null}
  if(st.last!=null&&t-st.last<HTRI-1e-9)return;st.last=t;st.t.push(t);
  for(let i=0;i<HTRM;i++){const p=it.pens[i],a=p&&hmiAd(p.a);st.v[i].push(!a?null:/^A[IO]\d+$/.test(a)?(pl.an&&pl.an[a])||0:/^[TC]\d+$/.test(a)?pl.v[a]||0:HBIT.test(a)?(pl.b[a]?1:0):null)}
  if(st.t.length>40000){st.t.splice(0,2000);st.v.forEach(a=>a.splice(0,2000))}}))}
function hmipTrClk(c,a){const act=a[1],id=+a.slice(2),it=hmiItems(c).find(q=>q.id===id);if(!it)return;const st=hmipTr(c,it),span=st.span||+it.ts||60;
 if(act==='p'){st.pause=st.pause==null?S.time:null;st.off=0}
 else if(act==='m'||act==='n'){let i=HTRS.findIndex(q=>q>=span);if(i<0)i=HTRS.length-1;i=hmipCl(i+(act==='n'?1:-1),0,HTRS.length-1);st.span=HTRS[i]}
 else if(st.pause!=null){const mb=Math.max(0,st.pause-(st.t[0]||0)-span/4);st.off=hmipCl(st.off+(act==='l'?1:-1)*span/2,0,mb)}}
function hmipTrend(c,it,clk){const{x,y,w,h}=it,demo=hmipDemo(c),st=hmipTr(c,it),span=st.span||+it.ts||60,P=hmiPlc(c),pens=(it.pens||[]).slice(0,HTRM),cl=v=>clk?` data-clk="${v}"`:'',fs=+it.fs||11,
 px0=x+40,px1=x+w-10,py0=y+28,py1=y+h-(pens.length?36:20),pw=Math.max(20,px1-px0),ph=Math.max(20,py1-py0),paused=st.pause!=null,end=demo?60:paused?st.pause-st.off:S.time,start=end-span;
 const ids=it.id,btn=(bx,lab,act,on)=>`<g${cl(act+ids)} style="cursor:pointer"><rect x=${bx} y=${y+4} width=22 height=18 rx=4 style="fill:${on?'#2d7dd2':'#1b2a38'};stroke:#35516a"/>`+(lab==='pause'?`<rect x=${bx+7} y=${y+8} width=3 height=10 style="fill:#fff;pointer-events:none"/><rect x=${bx+12} y=${y+8} width=3 height=10 style="fill:#fff;pointer-events:none"/>`:lab==='play'?`<polygon points="${bx+8},${y+8} ${bx+8},${y+18} ${bx+16},${y+13}" style="fill:#fff;pointer-events:none"/>`:hmipTx(bx+11,y+17,13,'fill:#fff;text-anchor:middle',lab))+'</g>';
 let g=`<rect x=${x} y=${y} width=${w} height=${h} rx=7 style="fill:#0a131b;stroke:#35516a;stroke-width:1.2"/>`+hmipTx(x+10,y+17,fs+1,'fill:'+hmiCol(it.c),esc(hmiClip(it.l,Math.max(4,Math.floor((w-(paused?190:140))/7)))))+
  btn(x+w-28,paused?'play':'pause','qp',paused)+btn(x+w-54,'+','qn')+btn(x+w-80,'−','qm')+(paused?btn(x+w-132,'›','qr')+btn(x+w-106,'‹','ql'):'')+hmipTx(x+w-(paused?138:86),y+17,10,'fill:#8fb3cf;text-anchor:end',hmipTs(span));
 /* Y range */
 let yn=hmipN(it.yn),yx=hmipN(it.yx);
 if(yn==null||yx==null||yx<=yn){let lo=1e99,hi=-1e99;if(!demo)pens.forEach((p,i)=>{if(HBIT.test(hmiAd(p.a)))return;st.v[i].forEach((v,j)=>{if(v!=null&&st.t[j]>=start&&st.t[j]<=end){lo=Math.min(lo,v);hi=Math.max(hi,v)}})});
  if(lo>hi){lo=0;hi=100}if(hi-lo<1e-6){lo-=1;hi+=1}const pad=(hi-lo)*.08;yn=yn!=null&&yx!=null&&yx>yn?yn:lo-pad;yx=hi+pad}
 const X=t=>px0+(t-start)/span*pw,Y=v=>py1-(v-yn)/(yx-yn)*ph,fm=v=>Math.abs(yx-yn)>=20?String(Math.round(v)):v.toFixed(1);
 g+=`<rect x=${px0} y=${py0} width=${pw} height=${ph} style="fill:#0f1a24;stroke:#35516a"/>`;
 for(let i=0;i<=4;i++){const gy=py0+ph*i/4,gx=px0+pw*i/4,lv=yx-(yx-yn)*i/4,tt=-span*(4-i)/4;
  g+=`<path d="M${px0} ${gy}H${px1}M${gx} ${py0}V${py1}" style="stroke:rgba(255,255,255,.09)"/>`+hmipTx(px0-4,gy+3,9,'fill:#8fb3cf;text-anchor:end',fm(lv))+
   hmipTx(gx,py1+12,9,'fill:#8fb3cf;text-anchor:'+(i===0?'start':i===4?'end':'middle'),i===4?(paused?'paused':'now'):'-'+hmipTs(-tt))}
 [['ll',HCOL.Red],['lw',HCOL.Amber],['hw',HCOL.Amber],['hh',HCOL.Red]].forEach(q=>{const v=hmipN(it[q[0]]);if(v!=null&&v>yn&&v<yx)g+=`<path d="M${px0} ${Y(v)}H${px1}" style="stroke:${q[1]};stroke-width:1;stroke-dasharray:5 4;opacity:.8"/>`});
 /* pens */
 const lg=[];
 pens.forEach((p,i)=>{const bit=HBIT.test(hmiAd(p.a)),pc=hmiCol(p.c);let d='',last=null;
  if(demo){for(let k=0;k<=80;k++){const t=start+span*k/80,v=bit?(Math.sin(t/7+i*2)>0?1:0):yn+(yx-yn)*(.5+.32*Math.sin(t/(9+i*4)+i));d+=(k?'L':'M')+X(t).toFixed(1)+' '+Y(bit?yn+(yx-yn)*(v?.85:.15):v).toFixed(1);last=v}}
  else{const T=st.t,V=st.v[i];let j0=0,j1=T.length;while(j0<j1){const m=(j0+j1)>>1;T[m]<start?j0=m+1:j1=m}j0=Math.max(0,j0-1);
   let jn=j0;while(jn<T.length&&T[jn]<=end)jn++;const stp=Math.max(1,Math.ceil((jn-j0)/(pw*1.5)));
   for(let j=j0;j<jn;j+=stp){const v=V[j];if(v==null)continue;const yy=bit?yn+(yx-yn)*(v?.85:.15):v;
    if(bit&&last!=null&&last!==v)d+='L'+hmipCl(X(T[j]),px0,px1).toFixed(1)+' '+Y(yn+(yx-yn)*(last?.85:.15)).toFixed(1);
    d+=(d?'L':'M')+hmipCl(X(T[j]),px0,px1).toFixed(1)+' '+hmipCl(Y(yy),py0,py1).toFixed(1);last=v}
   const lj=V.length?V[hmipCl(jn-1,0,V.length-1)]:null;if(lj!=null)last=lj}
  if(d)g+=`<path d="${d}" style="fill:none;stroke:${pc};stroke-width:1.7;stroke-linejoin:round"/>`;
  lg.push([pc,hmiAd(p.a)+(P&&plTag(P,hmiAd(p.a))?' '+plTag(P,hmiAd(p.a)):''),last==null?'--':bit?(last?'ON':'OFF'):fm(last)])});
 if(!demo&&!(S.run||st.t.length))g+=hmipTx(px0+pw/2,py0+ph/2,12,'fill:#6f8ba3;text-anchor:middle','No data – press ▶ Run');
 const cw=pw/Math.max(1,lg.length);lg.forEach((q,i)=>{const lx=px0+i*cw;g+=`<rect x=${lx} y=${y+h-18} width=9 height=9 rx=2 style="fill:${q[0]}"/>`+hmipTx(lx+13,y+h-10,10,'fill:#cfe3f1',esc(hmiClip(q[1]+'  '+q[2],Math.max(6,Math.floor((cw-16)/6)))))});
 return g}

/* ---------------- designer: inspector sections ---------------- */
const hmipAdIn=(f,v,l,ph)=>`<label>${l}<input type=text data-f=${f} value="${esc(v||'')}" list=hdAdAll autocomplete=off placeholder="${ph||''}"></label>`;
const hmipLn=(f,l,it)=>`<label>${l}<input type=number data-f=${f} value="${it[f]==null?'':it[f]}" step=any placeholder="–"></label>`;
const hmipColSel=(attr,cur,blank)=>`<select ${attr}>${(blank?[['','— no change —']]:[]).concat(Object.keys(HCOL).map(k=>[k,k])).map(o=>`<option value="${o[0]}" ${o[0]===cur?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
const hmipSelA=(attr,cur,L)=>`<select ${attr}>${L.map(o=>`<option value="${o[0]}" ${String(o[0])===String(cur)?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`;
function hmipLimPr(it){return`<h4>Limits (colours)</h4><div class=two>${hmipLn('ll','Low alarm',it)}${hmipLn('lw','Low warning',it)}</div><div class=two>${hmipLn('hw','High warning',it)}${hmipLn('hh','High alarm',it)}</div>
 <label class=ck><input type=checkbox data-f=lb ${it.lb?'checked':''}>Blink at an alarm</label><p class=mu style="margin:-2px 0 6px">Amber at a warning limit, red at an alarm limit (value at or beyond it). Same unit as the value (%, s, count). Empty = not used.</p>`}
function hmipPr(it){const k=it.k;let h='';
 if(k==='sym'){const sy=HSYM[it.sy]?it.sy:'tank',M=HSYM[sy];
  h+=`<label>Symbol${hmipSelA('data-f=sy',sy,Object.keys(HSYM).map(q=>[q,HSYM[q].n]))}</label>`+M.ad.map(q=>hmipAdIn(q[0],it[q[0]],q[1],q[2])).join('');
  if(sy==='tower')h+=[1,2,3].map(i=>`<label>${['Red','Amber','Green'][i-1]} lamp${hmipSelA('data-f=m'+i,it['m'+i]||'steady',[['steady','Steady'],['slow','Flashing (slow)'],['fast','Flashing (fast)']])}</label>`).join('');
  if(sy==='pipe')h+=`<label>Flow direction${hmipSelA('data-f=fd',it.fd||'fwd',[['fwd','Left → right / top → bottom'],['rev','Right → left / bottom → top']])}</label>`;
  if(M.sp)h+=hdNum('sp',it.sp==null?M.sp:it.sp,sy==='pipe'||sy==='conv'?'Speed (px / s)':'Speed (deg / s)');
  h+=`<p class=mu style="margin:2px 0 6px">${M.val?'Fill / needle follows the value between Min and Max below.':sy==='tower'?'Each lamp lights with its own bit.':'Fault bit = red, flashing; the symbol stops. Running colour = “Colour”; off = grey.'}</p>`}
 else if(k==='trend'){const pens=it.pens||[];
  h+=`<div class=two><label>Time span${hmipSelA('data-f=ts',it.ts||60,HTRS.map(s=>[s,hmipTs(s)]))}</label><span></span></div><div class=two>${hmipLn('yn','Y min',it)}${hmipLn('yx','Y max',it)}</div><p class=mu style="margin:-2px 0 6px">Empty Y min / max = automatic range. Bits are drawn as on / off lines.</p><h4>Pens (up to ${HTRM})</h4>`+
   pens.map((p,i)=>`<div class=al data-ri=${i} style="border-left-color:${hmiCol(p.c)}"><input type=text data-pf=a value="${esc(p.a)}" list=hdAdAll autocomplete=off placeholder="AI0" aria-label="PLC address">${hmipColSel('data-pf=c aria-label=Colour',p.c)}<button data-op=pdel data-i=${i} class=dn aria-label="Remove pen">×</button></div>`).join('')+
   (pens.length<HTRM?`<div class=row><button data-op=padd>＋ Add pen</button></div>`:'')}
 return h}
const HANT=[['col','Colour'],['blink','Blinking'],['vis','Visibility'],['fill','Fill level'],['rot','Rotation'],['mov','Movement']];
function hmipRuleNew(t){const q={t,a:''};if(t==='col'){q.on='Green';q.off='Grey'}else if(t==='blink')q.r='slow';else if(t==='vis')q.m='show';else if(t==='fill'){q.fd='up';q.on=''}else if(t==='rot')q.sp=180;else if(t==='mov'){q.dx=60;q.dy=0}return q}
function hmipAnPr(it){const L=it.an||[],nm=Object.fromEntries(HANT);
 return`<h4>Animation</h4>`+L.map((q,i)=>{const f=a=>`data-nf=${a}`,num=(a,l)=>`<label>${l}<input type=number ${f(a)} value="${q[a]==null?'':q[a]}" step=any></label>`;let b='';
  if(q.t==='col')b=`<div class=two><label>When ON${hmipColSel(f('on'),q.on,1)}</label><label>When OFF${hmipColSel(f('off'),q.off,1)}</label></div>`;
  else if(q.t==='blink')b=`<label>Rate${hmipSelA(f('r'),q.r||'slow',[['slow','Slow (1 Hz)'],['fast','Fast (2 Hz)']])}</label>`;
  else if(q.t==='vis')b=`<label>${hmipSelA(f('m'),q.m||'show',[['show','Show when ON'],['hide','Hide when ON']])}</label>`;
  else if(q.t==='fill')b=`<div class=two>${num('mn','Empty at')}${num('mx','Full at')}</div><div class=two><label>Fills${hmipSelA(f('fd'),q.fd||'up',[['up','upwards'],['down','downwards'],['right','to the right'],['left','to the left']])}</label><label>Colour${hmipColSel(f('on'),q.on,1)}</label></div>`;
  else if(q.t==='rot')b=num('sp','Speed (deg / s, negative = reverse)');
  else if(q.t==='mov')b=`<div class=two>${num('dx','Move X (px)')}${num('dy','Move Y (px)')}</div><div class=two>${num('mn','At value')}${num('mx','… to value')}</div>`;
  return`<div class=an data-ri=${i}><div class=anh><b>${esc(nm[q.t]||q.t)}</b><button data-op=ndel data-i=${i} class=dn aria-label="Remove animation">×</button></div><input type=text ${f('a')} value="${esc(q.a)}" list=hdAdAll autocomplete=off placeholder="PLC address (bit, AI, AO, timer …)" aria-label="PLC address">${b}</div>`}).join('')+
  `<div class=row><select id=hdAnT aria-label="Animation type">${HANT.map(q=>`<option value=${q[0]}>${q[1]}</option>`).join('')}</select><button data-op=nadd>＋ Add</button></div>
  <p class=mu>Rules run in order; a later colour rule wins. ON = bit 1, timer / counter done, or analog above 0. Test them in <b>Simulate</b> with ▶ Run.</p>`}
function hmipDatalist(P){const A=P?plAdrs(P):null;return`<datalist id=hdAdAll>${A?[].concat(A.I,A.Q,A.M,A.T,A.C,A.AI,A.AO).map(a=>`<option value="${a}">${esc(plTag(P,a))}</option>`).join(''):''}</datalist>`}

/* checks shown in the designer and in the results panel: missing / unknown addresses, limits out of order */
function hmipMsg(c,P,d,all,r){d.screens.forEach(s=>s.items.forEach(it=>{const n=`${c.label} / ${s.name}: “${it.l||HK[it.k]}”`,chk=(a,what)=>{a=hmiAd(a);if(!a)r.push(['wa',`${n} has no ${what}`]);else if(!all.has(a))r.push(['wa',`${n}: address ${a} does not exist in ${P.label} (check its I/O count)`])};
  if(it.k==='sym'){const M=HSYM[it.sy]||HSYM.tank;chk(it.a,'PLC address');if(it.sy==='tower')[it.a2,it.a3].forEach(a=>{if(hmiAd(a))chk(a,'')});else if(hmiAd(it.a2))chk(it.a2,'')}
  else if(it.k==='trend'){const pn=(it.pens||[]).filter(p=>hmiAd(p.a));if(!pn.length)r.push(['wa',`${n} has no pen with a PLC address`]);pn.forEach(p=>chk(p.a,''))}
  (it.an||[]).forEach(q=>{if(!hmiAd(q.a))r.push(['wa',`${n}: an animation has no PLC address`]);else if(!all.has(hmiAd(q.a)))r.push(['wa',`${n}: animation address ${hmiAd(q.a)} does not exist in ${P.label}`])});
  const L=['ll','lw','hw','hh'].map(k=>hmipN(it[k])).filter(v=>v!=null);if(L.some((v,i)=>i&&v<L[i-1]))r.push(['wa',`${n}: limits are out of order (low alarm ≤ low warning ≤ high warning ≤ high alarm)`])}))}
