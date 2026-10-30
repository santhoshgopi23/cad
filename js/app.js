/* ElectroSim – app: simulation engine (MNA), drawing sheet, UI.  Symbols live in parts.js */
const $=s=>document.querySelector(s),DT=.02,svg=$('#svg');
const f=x=>{if(x==null||isNaN(x))return'–';const a=Math.abs(x);if(a<1e-9)return'0';if(a>=1e3)return(x/1e3).toFixed(2)+'k';if(a<1)return(x*1e3).toFixed(1)+'m';return x.toFixed(2)};
const S={comps:[],wires:[],nid:1,sel:null,run:0,pause:0,time:0,msgs:[],tk:{},wiring:null,m:{x:0,y:0},z:1,title:'Motor start-stop control, 24 V DC',author:''};
/* ===== helpers ===== */
const by=id=>S.comps.find(c=>c.id===id),rot=(c,i)=>{const[x,y]=D[c.type].t[i],r=c.rot%4,[a,b]=[[1,0],[0,1],[-1,0],[0,-1]][r];return[c.x+x*a-y*b,c.y+x*b+y*a]};
const tp=k=>{const[id,i]=k.split('.');return rot(by(+id),+i)};
function add(type,x,y,p){const d=D[type],n=S.comps.filter(c=>D[c.type].pre===d.pre).length+1,c={id:S.nid++,type,x:Math.round(x/10)*10,y:Math.round(y/10)*10,rot:0,label:d.nolbl?'':d.pre+n,p:{},s:{on:!!d.on0}};for(const k in d.p)c.p[k]=d.p[k][0];if('ref'in c.p){const k=S.comps.find(q=>D[q.type].coil);c.p.ref=k?k.label:''}S.comps.push(c);return c}
function conn(a,b,pts){if(a!==b&&!S.wires.some(w=>(w.a==a&&w.b==b)||(w.a==b&&w.b==a)))S.wires.push({id:S.nid++,a,b,pts:pts?pts.map(q=>q.slice()):[]})}
/* ===== simulation engine (Modified Nodal Analysis) ===== */
function gauss(A,z){const N=z.length;for(let i=0;i<N;i++){let p=i;for(let r=i+1;r<N;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;if(Math.abs(A[p][i])<1e-14)return null;[A[i],A[p]]=[A[p],A[i]];[z[i],z[p]]=[z[p],z[i]];for(let r=i+1;r<N;r++){const q=A[r][i]/A[i][i];if(q){for(let c=i;c<N;c++)A[r][c]-=q*A[i][c];z[r]-=q*z[i]}}}const x=[];for(let i=N-1;i>=0;i--){let s=z[i];for(let c=i+1;c<N;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function step(){
 const P={},find=k=>{if(!(k in P))P[k]=k;return P[k]===k?k:(P[k]=find(P[k]))},cs=S.comps,msgs=S.msgs=[];
 cs.forEach(c=>D[c.type].t.forEach((_,i)=>find(c.id+'.'+i)));S.wires.forEach(w=>{P[find(w.a)]=find(w.b)});
 const srcs=cs.filter(c=>D[c.type].src);
 if(!srcs.length){msgs.push(['er','No power supply in the circuit']);cs.forEach(c=>c.o=null);S.tk={};return}
 const gc=cs.find(c=>D[c.type].gnd);cs.forEach(c=>{if(D[c.type].gnd)P[find(c.id+'.0')]=find(gc.id+'.0')});const g=gc?find(gc.id+'.0'):find(srcs[0].id+'.1'),idx={};let n=0;Object.keys(P).forEach(k=>{const r=find(k);if(r!==g&&!(r in idx))idx[r]=n++});
 const nd=(c,i)=>{const r=find(c.id+'.'+i);return r===g?-1:idx[r]};let els,x,ok=1;
 for(let it=0;it<8;it++){
  els=[];cs.forEach(c=>D[c.type].el(c).forEach(e=>{e.c=c;e.na=nd(c,e.a);e.nb=nd(c,e.b);els.push(e)}));
  const vs=els.filter(e=>e.k==='V'&&e.na!==e.nb),N=n+vs.length,A=Array.from({length:N},()=>new Array(N).fill(0)),z=new Array(N).fill(0);
  for(let i=0;i<n;i++)A[i][i]+=1e-9;
  els.forEach(e=>{const a=e.na,b=e.nb;if(e.k==='R'){const q=1/e.r;if(a>=0)A[a][a]+=q;if(b>=0)A[b][b]+=q;if(a>=0&&b>=0){A[a][b]-=q;A[b][a]-=q}}else if(e.k==='I'){if(a>=0)z[a]-=e.i;if(b>=0)z[b]+=e.i}});
  vs.forEach((e,k)=>{const r=n+k;if(e.na>=0){A[e.na][r]+=1;A[r][e.na]+=1}if(e.nb>=0){A[e.nb][r]-=1;A[r][e.nb]-=1}z[r]=e.v});
  x=gauss(A,z);if(!x){ok=0;break}
  const V=i=>i<0?0:x[i];vs.forEach((e,k)=>e.cur=-x[n+k]);
  els.forEach(e=>{e.v2=V(e.na)-V(e.nb);if(e.k==='R')e.cur=e.v2/e.r;else if(e.k==='I')e.cur=e.i;else if(e.na===e.nb)e.cur=0});
  let ch=0;
  cs.forEach(c=>{const E=els.filter(e=>e.c===c),e0=E[0],s=c.s,t=c.type;
   if(D[t].coil){const v=Math.abs(e0.v2),en=s.en?v>=.3*c.p.V:v>=.7*c.p.V;if(en!==!!s.en){s.en=en;ch=1}}
   if(D[t].fuse&&!s.blown&&Math.abs(e0.cur)>c.p.I*(D[t].tol||1)){s.blown=1;ch=1}
   if(D[t].trip&&!s.tripped&&Math.abs(e0.cur)>c.p.I){s.tripped=1;ch=1}
   if(D[t].brg)E.forEach((e,j)=>{const fw=e.v2>0;if(fw!==!!s['f'+j]){s['f'+j]=fw;ch=1}});
   if(D[t].dio){const fw=e0.v2>0;if(fw!==!!s.fw){s.fw=fw;ch=1}}
   if(D[t].xf){const vp=E[1].v2,dl=e0.cur;if(Math.abs(vp-(c.vp||0))>1e-4||Math.abs(dl-(c.dl||0))>1e-6)ch=1;c.vp=vp;c.dl=dl}});
  if(!ch)break;
  if(it===7)break;
 }
 if(!ok){msgs.push(['er','Numerical error: circuit could not be solved']);return}
 const V=i=>i<0?0:x[i],rf={};
 els.forEach(e=>{[e.a,e.b].forEach(i=>{const r=find(e.c.id+'.'+i);rf[r]=Math.max(rf[r]||0,Math.abs(e.cur))})});
 S.tk={};cs.forEach(c=>D[c.type].t.forEach((_,i)=>{const r=find(c.id+'.'+i);S.tk[c.id+'.'+i]={f:rf[r]||0,v:r===g?0:V(idx[r])}}));
 cs.forEach(c=>{const E=els.filter(e=>e.c===c),e=E[0];c.e=e;c.o={v:e.v2,i:D[c.type].dyn?e.cur+E[1].cur:e.cur,p:0};c.o.p=c.o.v*c.o.i;if(D[c.type].dyn=='c')c.s.vc=e.v2;if(D[c.type].dyn=='l')c.s.il=c.o.i});
 srcs.forEach(c=>{if(c.e.na===c.e.nb){msgs.push(['er',`SHORT CIRCUIT: ${c.label} terminals are directly connected`]);c.o={v:0,i:0,p:0}}else if(c.o.i>c.p.Imax)msgs.push(['er',`SHORT CIRCUIT / overload: ${c.label} supplying ${f(c.o.i)} A (limit ${c.p.Imax} A)`])});
 cs.forEach(c=>{const t=c.type,o=c.o,s=c.s,u=D[t].t.filter((_,i)=>!S.wires.some(w=>w.a===c.id+'.'+i||w.b===c.id+'.'+i)).length;
  if(u)msgs.push(['wa',`${c.label}: ${u} terminal(s) not connected`]);
  if(s.blown)msgs.push(['wa',`${c.label} fuse blown (overcurrent) – replace in properties`]);
  if(s.tripped)msgs.push(['wa',`${c.label} tripped on overcurrent – reset in properties`]);
  if((D[t].spin||['lamp','pl','buz','htr','sol'].includes(t))&&Math.abs(o.v)>1.15*c.p.V)msgs.push(['wa',`${c.label}: overvoltage ${f(Math.abs(o.v))} V (rated ${c.p.V} V)`]);
  if(t==='res'&&o.p>c.p.P)msgs.push(['wa',`${c.label}: dissipating ${f(o.p)} W, exceeds ${c.p.P} W rating`])});
 if(!msgs.some(m=>m[0]==='er')&&srcs.every(c=>Math.abs(c.o.i)<1e-6))msgs.push(['wa','Open circuit: no current flows from the supply']);
 if(!msgs.length)msgs.push(['ok','Circuit OK – no faults detected']);
}
function tick(){step();S.comps.forEach(c=>{if(D[c.type].tm=='off'){if(c.s.en){c.s.done=1;c.s.t=0}else if(c.s.done){c.s.t=(c.s.t||0)+DT;if(c.s.t>=c.p.T)c.s.done=0}}if(D[c.type].tm=='on'){if(c.s.en){c.s.t=(c.s.t||0)+DT;if(c.s.t>=c.p.T)c.s.done=1}else{c.s.t=0;c.s.done=0}}});S.time+=DT;S.comps.forEach(c=>{if(D[c.type].spin&&c.o)c.s.ang=((c.s.ang||0)+720*Math.min(1.2,Math.max(0,c.o.p/c.p.P))*DT)%360})}
function setRun(r,p){S.run=r;S.pause=p;$('#stat').textContent=!r?'STOPPED':p?'PAUSED':'RUNNING · t='+S.time.toFixed(1)+'s';$('#stat').style.color=!r?'':p?'var(--wa)':'var(--ok)'}
function stop(){setRun(0,0);S.time=0;S.tk={};S.msgs=[];S.comps.forEach(c=>{c.o=null;c.vp=c.dl=0;Object.assign(c.s,{en:0,done:0,t:0,fw:0,il:0,vc:0,blown:0,tripped:0,ang:0,pressed:0})});tbl()}
/* ===== rendering ===== */
function stt(c){const t=c.type,s=c.s,o=c.o;if(t==='spdt')return s.on?'COM-NO':'COM-NC';if(t==='ovl')return s.tripped?'TRIPPED':'OK';if(D[t].dio)return s.fw?'CONDUCTING':'BLOCKING';if(['buz','htr','sol'].includes(t))return o.p>.02*c.p.P?'ON':'OFF';if(t==='pl')return o.p>.02*c.p.P?'LIT':'OFF';if(D[t].tm=='off')return s.done?'CONTACT ON':'OFF';if(D[t].tm=='on')return s.done?'TIMED OUT':s.en?'TIMING '+(s.t||0).toFixed(1)+'s':'OFF';return t==='lamp'?(o.p>.02*c.p.P?'LIT '+Math.round(100*Math.min(1,o.p/c.p.P))+'%':'OFF'):D[t].spin?(o.p>.05*c.p.P?'RUNNING':'STOPPED'):D[t].coil?(s.en?'ENERGISED':'OFF'):D[t].fuse?(s.blown?'BLOWN':'OK'):D[t].cl?(D[t].cl(c)?'CLOSED':s.tripped?'TRIPPED':'OPEN'):''}
function route(a,b,pts){if(!pts||!pts.length){const my=Math.round((a[1]+b[1])/2/10)*10;return`M${a[0]} ${a[1]}L${a[0]} ${my}L${b[0]} ${my}L${b[0]} ${b[1]}`}const L=[a,...pts,b];let d=`M${a[0]} ${a[1]}`;for(let i=1;i<L.length;i++){const q=L[i],p=L[i-1];if(p[0]!=q[0]&&p[1]!=q[1])d+=`L${q[0]} ${p[1]}`;d+=`L${q[0]} ${q[1]}`}return d}
/* ===== drawing sheet (A3 landscape, IEC-style frame, zones and title block) ===== */
const SW_=1175,SH_=845,SX=25,SY=25,SWd=1123,SHt=794,FM=28,NC_=12,NR_=6;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function sheet(){
 const fx=SX+FM,fy=SY+FM,fw=SWd-2*FM,fh=SHt-2*FM,cw=fw/NC_,rh=fh/NR_;
 let h='<defs><pattern id="gp" x="-1" y="-1" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#c3cfdb"/></pattern></defs>';
 h+=`<rect class="shadow" x="${SX+5}" y="${SY+6}" width="${SWd}" height="${SHt}" fill="rgba(15,30,50,.16)"/><rect class="sh-bg" x="${SX}" y="${SY}" width="${SWd}" height="${SHt}"/>`;
 h+=`<rect class="grid" x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="url(#gp)"/><rect class="sh-fr" x="${fx}" y="${fy}" width="${fw}" height="${fh}"/>`;
 for(let i=0;i<=NC_;i++){const x=fx+i*cw;h+=`<path class="sh-ln" d="M${x} ${SY+8}V${fy}M${x} ${fy+fh}V${SY+SHt-8}"/>`;if(i)h+=`<text class="sh-zn" x="${x-cw/2}" y="${SY+21}">${i}</text><text class="sh-zn" x="${x-cw/2}" y="${fy+fh+21}">${i}</text>`}
 for(let j=0;j<=NR_;j++){const y=fy+j*rh;h+=`<path class="sh-ln" d="M${SX+8} ${y}H${fx}M${fx+fw} ${y}H${SX+SWd-8}"/>`;if(j)h+=`<text class="sh-zn" x="${SX+19}" y="${y-rh/2+3}">${'ABCDEF'[j-1]}</text><text class="sh-zn" x="${SX+SWd-19}" y="${y-rh/2+3}">${'ABCDEF'[j-1]}</text>`}
 const tw=470,th=88,tx=fx+fw-tw,ty=fy+fh-th,cx=tx+130,cc=(tw-130)/4;
 h+=`<rect class="w" x="${tx}" y="${ty}" width="${tw}" height="${th}" stroke="#17222e" stroke-width="1.6"/><path class="sh-ln" d="M${cx} ${ty}V${ty+th}M${cx} ${ty+48}H${tx+tw}"/>`;
 [1,2,3].forEach(i=>h+=`<path class="sh-ln" d="M${cx+i*cc} ${ty+48}V${ty+th}"/>`);
 h+=`<text class="sh-big" x="${tx+65}" y="${ty+40}" text-anchor="middle">⚡ ElectroSim</text><text class="sh-lb" x="${tx+65}" y="${ty+58}" text-anchor="middle">Electrical simulator</text><text class="sh-lb" x="${tx+65}" y="${ty+71}" text-anchor="middle">IEC 60617 · IEC 81346</text>`;
 h+=`<text class="sh-lb" x="${cx+8}" y="${ty+14}">Title</text><text class="sh-v" style="font-size:15px" x="${cx+8}" y="${ty+36}">${esc(S.title||'Untitled circuit')}</text>`;
 [['Drawn by',S.author||'–'],['Date',new Date().toISOString().slice(0,10)],['Sheet','1 / 1'],['Scale','1 : 1']].forEach(([l,v],i)=>h+=`<text class="sh-lb" x="${cx+8+i*cc}" y="${ty+60}">${l}</text><text class="sh-v" x="${cx+8+i*cc}" y="${ty+78}">${esc(v)}</text>`);
 return h;
}

/* ===== rendering ===== */
const RV=(x,y,r)=>{const[a,b]=[[1,0],[0,1],[-1,0],[0,-1]][r%4];return[x*a-y*b,x*b+y*a]};
const bbox=d=>d._bb||(d._bb=(()=>{const xs=d.t.map(q=>q[0]),ys=d.t.map(q=>q[1]);return[Math.min(-30,...xs)-12,Math.min(-44,...ys)-4,Math.max(30,...xs)+12,Math.max(44,...ys)+4]})());
const lblX=d=>d._lx||(d._lx=Math.max(24,Math.max(...d.t.map(q=>q[0]))+16));
function render(){
 let h=sheet();
 S.wires.forEach(w=>{const d=route(tp(w.a),tp(w.b),w.pts),k=S.tk[w.a],run=S.run&&k,hot=run&&k.f>1e-6,sel=S.sel&&S.sel.k=='w'&&S.sel.id==w.id;
  h+=`<path d="${d}" class="wire ${sel?'sel':hot?'hot':run&&Math.abs(k.v)>.01?'v':''}"/>${hot&&!sel?`<path d="${d}" class="fl"/>`:''}<path d="${d}" class="hit" data-w="${w.id}"/>`});
 const cnt={};S.wires.forEach(w=>{cnt[w.a]=(cnt[w.a]||0)+1;cnt[w.b]=(cnt[w.b]||0)+1});
 for(const k in cnt)if(cnt[k]>1){const[x,y]=tp(k);h+=`<circle cx="${x}" cy="${y}" r="3.4" class="f"/>`}
 if(S.wiring){const a=tp(S.wiring.from),mq=[Math.round(S.m.x/10)*10,Math.round(S.m.y/10)*10];h+=`<path d="${route(a,mq,S.wiring.pts)}" class="wire" stroke-dasharray="5 4" stroke="var(--hot)"/>`+S.wiring.pts.map(q=>`<circle cx="${q[0]}" cy="${q[1]}" r="3" class="f"/>`).join('')}
 S.comps.forEach(c=>{const d=D[c.type],cl=d.cl?d.cl(c):0,sel=S.sel&&S.sel.k=='c'&&S.sel.id==c.id,[x0,y0,x1,y1]=bbox(d),r=c.rot%4;
  h+=`<g transform="translate(${c.x} ${c.y})" data-c="${c.id}"><g transform="rotate(${c.rot*90})"><rect x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="transparent"/>${sel?`<rect class="selr" x="${x0+4}" y="${y0+4}" width="${x1-x0-8}" height="${y1-y0-8}" rx="5"/>`:''}${d.g(c,c.o,cl)}`;
  d.t.forEach(([x,y,n],i)=>h+=`<circle class="term" data-c="${c.id}" data-t="${i}" cx="${x}" cy="${y}" r="7"><title>${esc(d.pn&&d.pn(c,i)||n)}</title></circle><circle class="tdot" cx="${x}" cy="${y}" r="2.6"/>`);
  h+='</g>';
  d.t.forEach(([x,y],i)=>{const n=d.pn&&d.pn(c,i)||d.t[i][2];if(!n)return;const vert=Math.abs(y)>=Math.abs(x),[px,py]=RV(vert?x+8:x-(x>0?10:-10),vert?y+(y<0?9:-9):y-6,r);h+=`<text class="pn" x="${px}" y="${py}" dy=".35em">${esc(n)}</text>`});
  const lx=lblX(d),[vx,vy]=RV(lx,0,r),an=r==0?'start':r==2?'end':'middle',lbl=d.nolbl?c.p.ref:c.label,sb=d.sub?d.sub(c):'';
  h+=`<text class="tag" x="${vx}" y="${vy-2}" text-anchor="${an}">${lbl?'-'+esc(lbl):''}</text>`;
  if(sb)h+=`<text class="sub" x="${vx}" y="${vy+10}" text-anchor="${an}">${esc(sb)}</text>`;
  if(c.desc)h+=`<text class="sub" style="font-style:italic" x="${vx}" y="${vy+21}" text-anchor="${an}">${esc(c.desc)}</text>`;
  h+='</g>'});
 svg.innerHTML=h}
function tbl(){$('#tb').innerHTML=S.run?S.comps.filter(c=>c.o&&!D[c.type].gnd).map(c=>`<tr><td><b>${esc(D[c.type].nolbl?c.p.ref:c.label)}</b> <span class=mu>${D[c.type].n}</span></td><td>${f(c.o.v)} V</td><td>${f(c.o.i)} A</td><td>${f(c.o.p)} W</td><td>${stt(c)}</td></tr>`).join(''):'<tr><td colspan=5 class=mu>Press RUN to start the simulation.</td></tr>';
 const sup=S.comps.filter(c=>D[c.type].src&&c.o).reduce((a,c)=>a+c.o.p,0);
 $('#msgs').innerHTML=(S.run?`<div class=mu>Total supply power: <b>${f(sup)} W</b></div>`:'')+(S.run?S.msgs:[['ok','Idle – build a circuit, then press RUN']]).map(m=>`<div class="m ${m[0]}">${m[1]}</div>`).join('')}

/* ===== properties ===== */
function props(){const el=$('#props'),s=S.sel;
 if(!s){el.innerHTML=`<h3>Drawing</h3><label>Title<input data-s=title value="${esc(S.title)}"></label><label>Drawn by<input data-s=author value="${esc(S.author)}" placeholder="Your name"></label>
 <h4>How to use</h4><ul class=help><li>Drag parts from the library onto the sheet</li><li><b>Wire:</b> click a terminal, click to add bends, click another terminal (Esc / right-click cancels, Backspace removes a bend)</li><li><b>R</b> rotates · <b>Del</b> removes</li><li>Link a <b>contact</b> to a <b>coil</b> with “Controlled by”</li><li>While running, click switches · hold push buttons</li></ul>`;return}
 if(s.k=='w'){el.innerHTML='<h3>Wire</h3><button data-a=del>Delete wire</button>';return}
 const c=by(s.id),d=D[c.type];let h=`<h3>${d.n}</h3>`;
 if(!d.nolbl)h+=`<label>Tag (IEC 81346)<input data-l value="${esc(c.label)}"></label>`;
 h+=`<label>Description<input data-d value="${esc(c.desc||'')}" placeholder="e.g. Start"></label>`;
 for(const k in d.p){const[,u,nm,op]=d.p[k];
  if(op){let o=op==='coil'?S.comps.filter(q=>D[q.type].coil).map(q=>q.label):op;if(op==='coil'){if(!o.includes(c.p[k]))o=[c.p[k],...o];}h+=`<label>${nm}<select data-k=${k}>${o.map(v=>`<option ${c.p[k]==v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`}
  else h+=`<label>${nm} (${u})<input type=number step=any data-k=${k} value=${c.p[k]}></label>`}
 if(d.tog)h+=`<label class=chk><input type=checkbox data-on ${c.s.on?'checked':''}>${c.type=='estop'?'Pressed (latched)':d.cat=='Sensors'?'Target detected':'Closed / ON'}</label>`;
 if(c.type=='pb'||c.type=='pbnc')h+='<p class=mu>While running: hold the mouse button on the push button.</p>';
 if(c.s.blown||c.s.tripped)h+=`<button data-a=fix>${c.s.blown?'Replace fuse':'Reset breaker'}</button> `;
 el.innerHTML=h+'<p class=row><button data-a=rot>Rotate ⟳</button> <button data-a=del class=danger>Delete</button></p>'}
$('#props').addEventListener('input',e=>{const t=e.target;
 if(t.dataset.s){S[t.dataset.s]=t.value;return}
 const c=S.sel&&S.sel.k=='c'&&by(S.sel.id);if(!c)return;
 if('l'in t.dataset){c.label=t.value;if(D[c.type].coil)S.comps.forEach(q=>{});}else if('d'in t.dataset)c.desc=t.value;else if('on'in t.dataset)c.s.on=t.checked;else if(t.tagName=='SELECT')c.p[t.dataset.k]=t.value;else if(t.dataset.k){const v=parseFloat(t.value);if(v>0||(t.dataset.k=='pos'&&v>=0))c.p[t.dataset.k]=v}});
$('#props').addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;const c=S.sel.k=='c'&&by(S.sel.id);if(a=='del')del();if(a=='rot'&&c)c.rot=(c.rot+1)%4;if(a=='fix'){c.s.blown=c.s.tripped=0;props()}});
function del(){const s=S.sel;if(!s)return;if(s.k=='w')S.wires=S.wires.filter(w=>w.id!=s.id);else{S.comps=S.comps.filter(c=>c.id!=s.id);S.wires=S.wires.filter(w=>!w.a.startsWith(s.id+'.')&&!w.b.startsWith(s.id+'.'))}S.sel=null;props()}

/* ===== interaction ===== */
const cv=$('#cv'),mp=e=>{const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)/S.z,y:(e.clientY-r.top)/S.z}};let drag=null,moved=0;
const snap=v=>Math.round(v/10)*10;
svg.addEventListener('mousedown',e=>{if(e.button)return;const m=mp(e),T=e.target.closest('[data-t]'),C=e.target.closest('[data-c]'),W=e.target.closest('[data-w]');moved=0;
 if(T){const k=T.dataset.c+'.'+T.dataset.t;if(!S.wiring)S.wiring={from:k,pts:[]};else if(S.wiring.from!==k){conn(S.wiring.from,k,S.wiring.pts);S.wiring=null}return}
 if(S.wiring){S.wiring.pts.push([snap(m.x),snap(m.y)]);return}
 if(C){const c=by(+C.dataset.c);S.sel={k:'c',id:c.id};drag={c,dx:m.x-c.x,dy:m.y-c.y};props();if(S.run&&(c.type=='pb'||c.type=='pbnc'))c.s.pressed=1;return}
 if(W){S.sel={k:'w',id:+W.dataset.w};props();return}
 S.sel=null;props()});
addEventListener('mousemove',e=>{const m=mp(e);S.m=m;if(drag){moved=1;drag.c.x=snap(m.x-drag.dx);drag.c.y=snap(m.y-drag.dy)}});
addEventListener('mouseup',()=>{if(drag){const c=drag.c;if(S.run&&!moved&&D[c.type].tog){c.s.on=!c.s.on;props()}}drag=null;S.comps.forEach(c=>c.s.pressed=0)});
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(S.wiring&&e.key=='Backspace'){S.wiring.pts.pop();return}if(e.key=='Delete'||e.key=='Backspace')del();if(e.key=='Escape')S.wiring=null;if((e.key=='r'||e.key=='R')&&S.sel&&S.sel.k=='c')by(S.sel.id).rot=(by(S.sel.id).rot+1)%4});
svg.addEventListener('contextmenu',e=>{e.preventDefault();S.wiring=null});
cv.ondragover=e=>e.preventDefault();
cv.ondrop=e=>{e.preventDefault();const t=e.dataTransfer.getData('t');if(D[t]){const m=mp(e),c=add(t,m.x,m.y);S.sel={k:'c',id:c.id};props()}};
function setZ(z){S.z=Math.min(2,Math.max(.4,z));svg.style.width=SW_*S.z+'px';svg.style.height=SH_*S.z+'px';$('#zl').textContent=Math.round(S.z*100)+'%'}
$('#zi').onclick=()=>setZ(S.z*1.15);$('#zo').onclick=()=>setZ(S.z/1.15);$('#zf').onclick=()=>setZ(Math.min(1,(cv.clientWidth-16)/SW_));
cv.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZ(S.z*(e.deltaY<0?1.1:.9))}},{passive:false});

/* ===== library ===== */
const cats=[];Object.keys(D).forEach(k=>{if(!cats.includes(D[k].cat))cats.push(D[k].cat)});
$('#libList').innerHTML=cats.map(cat=>`<details class="cat" open><summary>${cat}</summary><div class="tiles">${Object.keys(D).filter(t=>D[t].cat==cat).map(t=>`<div class="item" draggable="true" data-t="${t}" data-n="${esc((D[t].n+' '+cat).toLowerCase())}" title="${esc(D[t].n)}">${icon(t)}<span>${D[t].n}</span></div>`).join('')}</div></details>`).join('');
$('#lib').addEventListener('dragstart',e=>{const i=e.target.closest('[data-t]');if(i)e.dataTransfer.setData('t',i.dataset.t)});
$('#lib').addEventListener('click',e=>{const i=e.target.closest('[data-t]');if(i){const c=add(i.dataset.t,(cv.scrollLeft+cv.clientWidth/2)/S.z+Math.random()*60,(cv.scrollTop+cv.clientHeight/2)/S.z+Math.random()*60);S.sel={k:'c',id:c.id};props()}});
$('#q').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();document.querySelectorAll('#libList .item').forEach(i=>i.style.display=!q||i.dataset.n.includes(q)?'':'none');document.querySelectorAll('#libList details').forEach(d=>{d.style.display=[...d.querySelectorAll('.item')].some(i=>i.style.display!=='none')?'':'none';if(q)d.open=true})});

/* ===== toolbar ===== */
$('#bRun').onclick=()=>{if(!S.run||S.pause){setRun(1,0);step()}};$('#bPause').onclick=()=>{if(S.run)setRun(1,!S.pause)};$('#bStop').onclick=stop;

/* ===== PDF export (A3 sheet + parts list, jsPDF from cdnjs) ===== */
function exportPDF(){
 const st=$('#stat');if(!S.comps.length){st.textContent='NOTHING TO EXPORT';return}if(!window.jspdf){st.textContent='PDF LIBRARY NOT LOADED';return}
 S.wiring=null;S.sel=null;render();props();
 const W=SWd,H=SHt,css=SVGCSS+'.selr,.fl,.hit,.term,.grid,.shadow{display:none}.sh-bg{stroke:none}.wire.hot,.wire.v{stroke:var(--ink);stroke-width:1.5;opacity:1}';
 const cl=svg.cloneNode(true);cl.removeAttribute('style');cl.setAttribute('xmlns','http://www.w3.org/2000/svg');cl.setAttribute('viewBox',`${SX} ${SY} ${W} ${H}`);cl.setAttribute('width',W);cl.setAttribute('height',H);cl.insertAdjacentHTML('afterbegin',`<style>${css}</style>`);
 const img=new Image();img.onerror=()=>{st.textContent='EXPORT FAILED'};
 img.onload=()=>{const c2=document.createElement('canvas');c2.width=W*2;c2.height=H*2;const cx=c2.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,W*2,H*2);cx.scale(2,2);cx.drawImage(img,0,0,W,H);
  const pdf=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  pdf.addImage(c2.toDataURL('image/jpeg',.94),'JPEG',0,0,297,210);
  pdf.addPage('a4','portrait');pdf.setFontSize(14);pdf.text('Parts list – '+(S.title||'Untitled circuit'),15,18);pdf.setFontSize(9);let y=28;const ln=t=>{if(y>280){pdf.addPage();y=18}pdf.text(t,15,y);y+=5.2};
  S.comps.forEach(c=>{const d=D[c.type];ln(`-${d.nolbl?c.p.ref:c.label}   ${d.n}   ${Object.entries(c.p).filter(([k])=>k!='ref').map(([a,b])=>a+'='+b).join(', ')}${c.desc?'   ('+c.desc+')':''}`)});
  if(S.run&&S.comps.some(c=>c.o)){y+=4;ln('Simulation results (t='+S.time.toFixed(1)+' s)');S.comps.filter(c=>c.o&&!D[c.type].gnd).forEach(c=>ln(`-${D[c.type].nolbl?c.p.ref:c.label}   V=${f(c.o.v)} V   I=${f(c.o.i)} A   P=${f(c.o.p)} W`))}
  pdf.save('electrosim-circuit.pdf');st.textContent='PDF EXPORTED'};
 img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(cl));
}
$('#bPdf').onclick=exportPDF;
$('#bSave').onclick=()=>{try{localStorage.setItem('esim2',JSON.stringify({c:S.comps.map(c=>({...c,o:null,e:null})),w:S.wires,n:S.nid,t:S.title,a:S.author}));$('#stat').textContent='SAVED'}catch(e){$('#stat').textContent='SAVE FAILED'}};
$('#bLoad').onclick=()=>{try{const d=JSON.parse(localStorage.getItem('esim2'));if(!d)throw 0;stop();S.comps=d.c.filter(c=>D[c.type]);S.wires=d.w;S.nid=d.n;S.title=d.t||'';S.author=d.a||'';S.sel=null;props();$('#stat').textContent='LOADED'}catch(e){$('#stat').textContent='NOTHING SAVED'}};
let rs=0;$('#bReset').onclick=function(){if(!rs){rs=1;this.textContent='SURE?';setTimeout(()=>{rs=0;this.textContent='Reset'},2500)}else{rs=0;this.textContent='Reset';stop();S.comps=[];S.wires=[];S.sel=null;props()}};

/* ===== demo circuit: DOL-style start/stop with seal-in contact (24 V DC) ===== */
function demo(){
 const g=add('dc',100,360),fu=add('fus',100,240),sb1=add('pbnc',240,200),sb2=add('pb',200,360),km=add('kc',240,520),k1=add('cno',280,360),k2=add('cno',420,200),h1=add('pl',420,360),k3=add('cnc',560,200),h2=add('pl',560,360);
 g.label='G1';fu.label='FA1';fu.p.I=4;sb1.label='SB1';sb1.desc='Stop';sb2.label='SB2';sb2.desc='Start';km.label='KM1';km.desc='Motor contactor';
 [k1,k2,k3].forEach(k=>k.p.ref='KM1');k1.desc='Seal-in';k2.desc='Run';k3.desc='Stopped';h1.label='HL1';h1.p.col='green';h1.desc='RUN';h2.label='HL2';h2.p.col='red';h2.desc='STOP';
 const w=(a,i,b,j,pts)=>conn(a.id+'.'+i,b.id+'.'+j,pts);
 w(fu,1,g,0);w(fu,0,sb1,0,[[100,120],[240,120]]);w(fu,0,k2,0,[[100,120],[420,120]]);w(fu,0,k3,0,[[100,120],[560,120]]);
 w(sb1,1,sb2,0,[[240,280],[200,280]]);w(sb1,1,k1,0,[[240,280],[280,280]]);
 w(sb2,1,km,0,[[200,440],[240,440]]);w(k1,1,km,0,[[280,440],[240,440]]);
 w(k2,1,h1,0);w(k3,1,h2,0);
 w(km,1,g,1,[[240,640],[100,640]]);w(h1,1,g,1,[[420,640],[100,640]]);w(h2,1,g,1,[[560,640],[100,640]]);
 S.sel=null}
demo();
setZ(Math.min(1,(cv.clientWidth-16)/SW_)||1);props();tbl();let last=0,lt=0;
(function loop(t){if(S.run&&!S.pause&&t-last>=20){last=t;tick();$('#stat').textContent='RUNNING · t='+S.time.toFixed(1)+'s'}render();if(t-lt>150){lt=t;tbl()}requestAnimationFrame(loop)})(0);
