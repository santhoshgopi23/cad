/* ElectroSim – simulation engine
   Modified Nodal Analysis. Sources may carry a phase angle (3-phase): the network is resistive, so the real and
   imaginary parts are solved as two right-hand sides of the same matrix and reported as signed magnitudes. */
'use strict';
const sm=(a,b)=>{const m=Math.hypot(a,b);return a<-1e-12?-m:m};
const m3run=c=>!!(c.o&&c.ph&&Math.min(...c.ph)>.7*c.p.V/SQ3);

function lmap(){LM={};S.comps.forEach(c=>{if(D[c.type].xr){const k=String(c.label).trim().toUpperCase();if(k&&!(k in LM))LM[k]=c}})}

function gauss(A,Z){const N=A.length;
 for(let i=0;i<N;i++){let p=i;for(let r=i+1;r<N;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;if(Math.abs(A[p][i])<1e-14)return null;
  [A[i],A[p]]=[A[p],A[i]];Z.forEach(z=>{[z[i],z[p]]=[z[p],z[i]]});
  for(let r=i+1;r<N;r++){const q=A[r][i]/A[i][i];if(q){for(let c=i;c<N;c++)A[r][c]-=q*A[i][c];Z.forEach(z=>{z[r]-=q*z[i]})}}}
 return Z.map(z=>{const x=[];for(let i=N-1;i>=0;i--){let s=z[i];for(let c=i+1;c<N;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x})}

function step(){
 lmap();
 const P={},find=k=>{if(!(k in P))P[k]=k;return P[k]===k?k:(P[k]=find(P[k]))},cs=S.comps,msgs=S.msgs=[];
 cs.forEach(c=>D[c.type].t.forEach((_,i)=>find(c.id+'.'+i)));
 S.wires.forEach(w=>{P[find(w.a)]=find(w.b)});
 /* net labels with the same name are one node, even across pages */
 const nm={};cs.forEach(c=>{if(c.type!=='nl')return;const k=String(c.p.name).trim().toUpperCase();if(!k)return;const t=find(c.id+'.0');if(k in nm)P[find(t)]=find(nm[k]);else nm[k]=t});
 const srcs=cs.filter(c=>D[c.type].src);
 if(!srcs.length){msgs.push(['er','No power supply in the circuit']);cs.forEach(c=>{c.o=null;c.ph=null});S.tk={};return}
 const g=find(srcs[0].id+'.'+(D[srcs[0].type].gi==null?1:D[srcs[0].type].gi)),idx={};let n=0;
 Object.keys(P).forEach(k=>{const r=find(k);if(r!==g&&!(r in idx))idx[r]=n++});
 const nd=(c,i)=>{const r=find(c.id+'.'+i);return r===g?-1:idx[r]};
 let els,xr,xi,ok=1;
 for(let it=0;it<8;it++){
  els=[];cs.forEach(c=>D[c.type].el(c).forEach(e=>{e.c=c;e.na=nd(c,e.a);e.nb=nd(c,e.b);els.push(e)}));
  const vs=els.filter(e=>e.k==='V'&&e.na!==e.nb),N=n+vs.length,A=Array.from({length:N},()=>new Array(N).fill(0)),zr=new Array(N).fill(0),zi=new Array(N).fill(0);
  for(let i=0;i<n;i++)A[i][i]+=1e-9;
  els.forEach(e=>{const a=e.na,b=e.nb;if(e.k==='R'){const q=1/e.r;if(a>=0)A[a][a]+=q;if(b>=0)A[b][b]+=q;if(a>=0&&b>=0){A[a][b]-=q;A[b][a]-=q}}else if(e.k==='I'){if(a>=0)zr[a]-=e.i;if(b>=0)zr[b]+=e.i}});
  let hasI=0;
  vs.forEach((e,k)=>{const r=n+k;if(e.na>=0){A[e.na][r]+=1;A[r][e.na]+=1}if(e.nb>=0){A[e.nb][r]-=1;A[r][e.nb]-=1}const an=(e.ang||0)*Math.PI/180;zr[r]=e.v*Math.cos(an);if(e.ang){zi[r]=e.v*Math.sin(an);hasI=1}});
  const sol=gauss(A,hasI?[zr,zi]:[zr]);if(!sol){ok=0;break}
  xr=sol[0];xi=sol[1]||null;
  const Vr=i=>i<0?0:xr[i],Vi=i=>i<0||!xi?0:xi[i];
  vs.forEach((e,k)=>e.cur=-sm(xr[n+k],xi?xi[n+k]:0));
  els.forEach(e=>{e.v2=sm(Vr(e.na)-Vr(e.nb),Vi(e.na)-Vi(e.nb));if(e.k==='R')e.cur=e.v2/e.r;else if(e.k==='I')e.cur=e.i;else if(e.na===e.nb)e.cur=0});
  /* complex voltage / current per element (real power P = Re(V·I*) stays correct for line-to-line loads) */
  vs.forEach((e,k)=>{e.cr=-xr[n+k];e.ci=xi?-xi[n+k]:0});
  els.forEach(e=>{e.vr=Vr(e.na)-Vr(e.nb);e.vi=Vi(e.na)-Vi(e.nb);if(e.k==='R'){e.cr=e.vr/e.r;e.ci=e.vi/e.r}else if(e.k==='I'){e.cr=e.i;e.ci=0}else if(e.cr==null)e.cr=e.ci=0});
  let ch=0;
  cs.forEach(c=>{const E=els.filter(e=>e.c===c),e0=E[0],s=c.s,t=c.type,d=D[t];if(!e0)return;
   if(d.cv){const cv=c.p.V||c.p.Vin,v=Math.abs(e0.v2),en=s.en?v>=.3*cv:v>=.7*cv;if(en!==!!s.en){s.en=en;ch=1}}
   if(t==='fus'&&!s.blown&&Math.abs(e0.cur)>c.p.I){s.blown=1;ch=1}
   if(TRIP.includes(t)&&!s.tripped){const m=Math.max(...E.slice(0,d.np||1).map(q=>Math.abs(q.cur)));if(m>c.p.I){s.tripped=1;ch=1}}
   if(t==='dio'||t==='led'){const fw=e0.v2>0;if(fw!==!!s.fw){s.fw=fw;ch=1}}
   if(t==='xf'){const vp=E[1].v2,dl=e0.cur;if(Math.abs(vp-(c.vp||0))>1e-4||Math.abs(dl-(c.dl||0))>1e-6)ch=1;c.vp=vp;c.dl=dl}});
  if(!ch)break;
  if(it===7)break;
 }
 if(!ok){msgs.push(['er','Numerical error: circuit could not be solved']);return}
 const Vr=i=>i<0?0:xr[i],Vi=i=>i<0||!xi?0:xi[i],rf={};
 els.forEach(e=>{[e.a,e.b].forEach(i=>{const r=find(e.c.id+'.'+i);rf[r]=Math.max(rf[r]||0,Math.abs(e.cur))})});
 S.tk={};cs.forEach(c=>D[c.type].t.forEach((_,i)=>{const r=find(c.id+'.'+i);S.tk[c.id+'.'+i]={f:rf[r]||0,v:r===g?0:sm(Vr(idx[r]),Vi(idx[r]))}}));
 cs.forEach(c=>{const E=els.filter(e=>e.c===c),e=E[0],d=D[c.type],t=c.type;c.ph=null;if(!e){c.o=null;c.e=null;return}
  c.e=e;c.o={v:e.v2,i:t==='cap'?e.cur+E[1].cur:e.cur,p:0};c.o.p=c.o.v*c.o.i;c.io=E[1]?E[1].cur:0;
  if(d.agg){const L=E.filter(q=>q.k===(d.src?'V':'R')),dl=t==='mot3'&&c.p.wc==='Delta';
   c.o.p=L.reduce((a,q)=>a+q.vr*q.cr+q.vi*q.ci,0);c.o.i=Math.max(...L.map(q=>Math.hypot(q.cr,q.ci)))*(dl?SQ3:1);
   c.o.v=Math.hypot(e.vr,e.vi)*(dl?1:SQ3);if(t==='mot3')c.ph=L.map(q=>Math.hypot(q.vr,q.vi)/(dl?SQ3:1))}
  if(t==='cap')c.s.vc=e.v2});
 srcs.forEach(c=>{if(els.some(q=>q.c===c&&q.k==='V'&&q.na===q.nb)){msgs.push(['er',`SHORT CIRCUIT: ${c.label} terminals are directly connected`]);c.o={v:0,i:0,p:0}}else if(Math.abs(c.o.i)>c.p.Imax)msgs.push(['er',`SHORT CIRCUIT / overload: ${c.label} supplying ${f(Math.abs(c.o.i))} A (limit ${c.p.Imax} A)`])});
 cs.forEach(c=>{const t=c.type,o=c.o,s=c.s,d=D[t],u=d.t.filter((tt,i)=>!(tt[3]&&/[oh]/.test(tt[3]))&&!S.wires.some(w=>w.a===c.id+'.'+i||w.b===c.id+'.'+i)).length;
  if(u)msgs.push(['wa',`${c.label}: ${u} terminal(s) not connected`]);
  if(s.blown)msgs.push(['wa',`${c.label} fuse blown (overcurrent) – replace in properties`]);
  if(s.tripped)msgs.push(['wa',`${c.label} tripped on overcurrent – reset in properties`]);
  if(['lamp','mot','mot3','pl','buz','htr','sol'].includes(t)&&Math.abs(o.v)>1.15*c.p.V)msgs.push(['wa',`${c.label}: overvoltage ${f(Math.abs(o.v))} V (rated ${c.p.V} V)`]);
  if(t==='res'&&o.p>c.p.P)msgs.push(['wa',`${c.label}: dissipating ${f(o.p)} W, exceeds ${c.p.P} W rating`]);
  if(t==='mot3'&&c.ph){const mx=Math.max(...c.ph),mn=Math.min(...c.ph);if(mx>.5*c.p.V/SQ3&&mn<.7*c.p.V/SQ3)msgs.push(['wa',`${c.label}: phase loss / low voltage on a phase – motor cannot run`])}
  if(t==='psu'&&s.en&&Math.abs(c.io)*c.p.Vo>1.05*c.p.P)msgs.push(['wa',`${c.label}: output overloaded (${f(Math.abs(c.io))} A at ${c.p.Vo} V)`]);
  if(d.p&&d.p.ref&&!(String(c.p.ref).trim().toUpperCase() in LM))msgs.push(['wa',`Contact refers to “${c.p.ref}” – no coil or relay with that label`])});
 if(!msgs.some(m=>m[0]==='er')&&srcs.every(c=>Math.abs(c.o.i)<1e-6))msgs.push(['wa','Open circuit: no current flows from the supply']);
 if(!msgs.length)msgs.push(['ok','Circuit OK – no faults detected']);
}

function tick(){step();
 S.comps.forEach(c=>{const t=c.type,s=c.s;
  if(t==='ton'||t==='tcoil'){if(s.en){s.t=(s.t||0)+DT;if(s.t>=c.p.T)s.done=1}else{s.t=0;s.done=0}}
  if(t==='tcoff'){if(s.en){s.hold=1;s.t=0}else if(s.hold){s.t=(s.t||0)+DT;if(s.t>=c.p.T){s.hold=0;s.t=0}}}});
 S.time+=DT;
 S.comps.forEach(c=>{if(!c.o)return;if(c.type==='mot')c.s.ang=((c.s.ang||0)+720*Math.min(1.2,Math.max(0,c.o.p/c.p.P))*DT)%360;
  if(c.type==='mot3')c.s.ang=((c.s.ang||0)+(m3run(c)?720*Math.min(1.2,c.o.p/c.p.P):0)*DT)%360})}

function stt(c){const t=c.type,s=c.s,o=c.o,d=D[t];
 if(t==='ovl'||t==='ovl3')return s.tripped?'TRIPPED':'OK';
 if(t==='dio')return s.fw?'CONDUCTING':'BLOCKING';
 if(t==='led')return s.fw?'LIT':'OFF';
 if(['buz','htr','sol'].includes(t))return o.p>.02*c.p.P?'ON':'OFF';
 if(t==='pl')return o.p>.02*c.p.P?'LIT':'OFF';
 if(t==='ton'||t==='tcoil')return s.done?'TIMED OUT':s.en?'TIMING '+(s.t||0).toFixed(1)+'s':'OFF';
 if(t==='tcoff')return s.en?'ENERGISED':s.hold?'HOLDING '+(s.t||0).toFixed(1)+'s':'OFF';
 if(t==='lamp')return o.p>.02*c.p.P?'LIT '+Math.round(100*Math.min(1,o.p/c.p.P))+'%':'OFF';
 if(t==='mot')return o.p>.05*c.p.P?'RUNNING':'STOPPED';
 if(t==='mot3')return m3run(c)?'RUNNING':(c.ph&&Math.max(...c.ph)>.5*c.p.V/SQ3?'PHASE LOSS':'STOPPED');
 if(['rel','con','coil','rcoil'].includes(t))return s.en?'ENERGISED':'OFF';
 if(t==='psu')return s.en?'OUTPUT '+c.p.Vo+' V':'OFF';
 if(t==='sel3')return c.p.pos;
 if(t==='fus')return s.blown?'BLOWN':'OK';
 return d.cl?(d.cl(c)?'CLOSED':s.tripped?'TRIPPED':'OPEN'):''}
