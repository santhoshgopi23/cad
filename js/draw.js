/* ElectroSim – drawing layer: geometry, component/page markup, sheet frame and title block (shared by editor and PDF) */
'use strict';
const PAPER={A5:[210,148],A4:[297,210],A3:[420,297],A2:[594,420]},U=4;           /* sheet unit: 1 mm = 4 units */
const paperPx=()=>{const p=PAPER[S.tb.paper]||PAPER.A4;return S.tb.orient==='P'?[p[1]*U,p[0]*U]:[p[0]*U,p[1]*U]};
const by=id=>S.comps.find(c=>c.id===id);
const cid=k=>+String(k).split('.')[0];
const pnum=pg=>S.pages.findIndex(p=>p.id===pg)+1;
const hidT=t=>t[3]&&t[3].includes('h');
const dd=c=>{const d=D[c.type];return d.dyn?d.dyn(c):d};   /* per-instance definition (parts whose terminals depend on their settings, e.g. the PLC) */
const csc=c=>SC*(c.sc||1);                           /* per-part size: SC × user scale */
const rot=(c,i)=>{const[x,y]=dd(c).t[i],[a,b]=[[1,0],[0,1],[-1,0],[0,-1]][c.rot%4],k=csc(c);return[c.x+k*(x*a-y*b),c.y+k*(x*b+y*a)]};
const tp=k=>{const[id,i]=String(k).split('.');return rot(by(+id),+i)};
const hz=(d,x,y)=>d.vs?false:(d.hs||Math.abs(x)>=Math.abs(y));
const tdir=(c,i)=>{const d=dd(c),[x,y]=d.t[i],h=hz(d,x,y);return(c.rot%2?!h:h)?'h':'v'};
const snapG=v=>S.snap===0?v:Math.round(v/GRID)*GRID;
const tnorm=(c,i)=>{const d=dd(c),[x,y]=d.t[i],v=hz(d,x,y)?[x<0?-1:1,0]:[0,y<0?-1:1],[a,b]=[[1,0],[0,1],[-1,0],[0,-1]][c.rot%4];return[v[0]*a-v[1]*b,v[0]*b+v[1]*a]};
/* orthogonal wire: leaves/enters each terminal along its outward normal, picks the first bend pattern that does not double back */
function route(a,b,na,nb){
 const sg=S.free?v=>v:snapG,a1=[a[0]+na[0]*GRID,a[1]+na[1]*GRID],b1=nb?[b[0]+nb[0]*GRID,b[1]+nb[1]*GRID]:b,mx=sg((a1[0]+b1[0])/2),my=sg((a1[1]+b1[1])/2);
 const hh=[a1,[mx,a1[1]],[mx,b1[1]],b1],vv=[a1,[a1[0],my],[b1[0],my],b1],hv=[a1,[b1[0],a1[1]],b1],vh=[a1,[a1[0],b1[1]],b1];
 const ah=na[0]!==0,bh=nb?nb[0]!==0:ah,order=ah&&bh?[hh,hv,vh,vv]:!ah&&!bh?[vv,vh,hv,hh]:ah?[hv,vh,hh,vv]:[vh,hv,vv,hh];
 const dd=p=>p.filter((q,i)=>!i||q[0]!==p[i-1][0]||q[1]!==p[i-1][1]),dir=(p,q)=>[Math.sign(q[0]-p[0]),Math.sign(q[1]-p[1])];
 const ok=q=>{q=dd(q);if(q.length<2)return true;const f=dir(q[0],q[1]),l=dir(q[q.length-2],q[q.length-1]);if((f[0]||f[1])&&f[0]===-na[0]&&f[1]===-na[1])return false;if(nb&&l[0]===nb[0]&&l[1]===nb[1]&&(l[0]||l[1]))return false;return true};
 const pts=dd([a,...(order.find(ok)||order[0]),...(nb?[b]:[])]);
 return'M'+pts.map(q=>q[0]+' '+q[1]).join('L')}
/* ===== wires with corner points (v8.15) =====
   A wire may carry w.v = [[x,y],…]: the corners the user clicked while drawing it. The path is  terminal → short stub → corners → stub → terminal,
   with an extra elbow only where two points are not on one horizontal / vertical line. A wire without w.v keeps the automatic route(). */
function viaPts(a,na,v,end,nb){
 const P=[a,[a[0]+na[0]*GRID,a[1]+na[1]*GRID]],last=()=>P[P.length-1],prevH=()=>P.length<2||P[P.length-2][1]===last()[1];
 v.forEach((q,i)=>{const l=last();if(l[0]!==q[0]&&l[1]!==q[1]){const h=i?!prevH():na[0]!==0;P.push(h?[q[0],l[1]]:[l[0],q[1]])}P.push([q[0],q[1]])});
 if(nb){const b1=[end[0]+nb[0]*GRID,end[1]+nb[1]*GRID],l=last();if(l[0]!==b1[0]&&l[1]!==b1[1])P.push(nb[0]!==0?[l[0],b1[1]]:[b1[0],l[1]]);P.push(b1,end)}
 else P.push(end);
 return P.filter((q,i)=>!i||q[0]!==P[i-1][0]||q[1]!==P[i-1][1])}
const viaPath=(a,b,na,nb,v)=>'M'+viaPts(a,na,v,b,nb).map(q=>q[0]+' '+q[1]).join('L');
/* the point a new corner would get: snapped to the grid and kept on a horizontal / vertical line from the previous point */
function wvBase(){const k=S.wiring,a=by(cid(k)),n=tnorm(a,+String(k).split('.')[1]),p=tp(k),v=S.wvia||[];return v.length?v[v.length-1]:[p[0]+n[0]*GRID,p[1]+n[1]*GRID]}
function wvSnap(m){const b=wvBase(),x=snapG(m.x),y=snapG(m.y);return Math.abs(x-b[0])>=Math.abs(y-b[1])?[x,b[1]]:[b[0],y]}
function mk(type,x,y){const d=D[type],c={id:0,type,x:x||0,y:y||0,rot:0,label:d.pre+'1',p:{},s:{on:BRK.includes(type)},pg:S.pg};for(const k in d.p)c.p[k]=d.p[k][0];if(d.sc0)c.sc=d.sc0;return c}
function bbox(d,c){if(d.bb)return typeof d.bb==='function'?d.bb(c):d.bb;
 const ts=d.t.filter(t=>!hidT(t)),xs=[-22,22,...ts.map(t=>t[0])],ys=[-22,22,...ts.map(t=>t[1])],x0=Math.min(...xs)-6,y0=Math.min(...ys)-6;
 return[x0,y0,Math.max(...xs)+6-x0,Math.max(...ys)+6-y0]}
function stubs(d){let h='';const sx=d.sx||22,sy=d.sy||22;
 d.t.forEach(([x,y,,fl])=>{if(fl&&/[hn]/.test(fl))return;const e=hz(d,x,y)?[Math.sign(x)*sx,y]:[x,Math.sign(y)*sy];h+=`<path d="M${x} ${y}L${e[0]} ${e[1]}" class=s />`});return h}

function compSVG(c,live,sel){
 const d=dd(c),o=live?c.o:null,cl=d.cl?d.cl(c):0,bb=bbox(d,c),k=d.us?'':`scale(${csc(c)}) `,K=csc(c);
 let h=`<g transform="translate(${c.x} ${c.y})" data-c="${c.id}"><g transform="${k}rotate(${c.rot*90})">`;
 if(live&&!d.nh)h+=`<rect x=${bb[0]} y=${bb[1]} width=${bb[2]} height=${bb[3]} fill=transparent />`;
 if(sel)h+=`<rect class=selr x=${bb[0]-4} y=${bb[1]-4} width=${bb[2]+8} height=${bb[3]+8} rx=6 />`;
 h+=stubs(d)+d.g(c,o,cl);
 d.t.forEach(([x,y,n,fl],i)=>{if(fl&&fl.includes('h'))return;
  h+=`<circle class="term${fl&&fl.includes('a')?' air':''}" data-c=${c.id} data-t=${i} cx=${x} cy=${y} r=4.5><title>${esc(n)}</title></circle>`+(live?`<circle class=tH data-c=${c.id} data-t=${i} cx=${x} cy=${y} r=7 />`:'')});
 h+='</g>';
 if(sel&&live&&!d.us){const[a,b]=[[1,0],[0,1],[-1,0],[0,-1]][c.rot%4];let best=null;
  [[bb[0],bb[1]],[bb[0]+bb[2],bb[1]],[bb[0],bb[1]+bb[3]],[bb[0]+bb[2],bb[1]+bb[3]]].forEach(([x,y])=>{const px=K*(x*a-y*b),py=K*(x*b+y*a);if(!best||px+py>best[0]+best[1])best=[px,py]});
  h+=`<circle class="hnd chs" data-ch=${c.id} cx=${best[0]+5} cy=${best[1]+5} r=${(matchMedia('(pointer:coarse)').matches?14:8)/S.z}><title>Drag to resize</title></circle>`}
 if(!d.nolbl){const r=c.rot%4,ry=(x,y)=>[y,x,-y,-x][r],rx=(x,y)=>[x,-y,-x,y][r],cs=[[bb[0],bb[1]],[bb[0]+bb[2],bb[1]],[bb[0],bb[1]+bb[3]],[bb[0]+bb[2],bb[1]+bb[3]]],
   ys=cs.map(q=>ry(q[0],q[1])),xs=cs.map(q=>rx(q[0],q[1])),tall=(Math.max(...ys)-Math.min(...ys))>1.2*(Math.max(...xs)-Math.min(...xs));
  let lx=tall?Math.min(...xs)*K-6:0,ly=tall?4:Math.max(...ys)*K+13,an=tall?' style="text-anchor:end"':'';
  if(d.lp){lx=d.lp[0]*K;ly=d.lp[1]*K;an=d.lp[2]==='end'?' style="text-anchor:end"':' style="text-anchor:start"'}
  h+=`<text x=${lx} y=${ly} class=tx${an}>${esc(c.label)}</text>`;
  if(d.xr){const L=String(c.label).trim().toUpperCase(),ps=[...new Set(S.comps.filter(q=>q.p&&q.p.ref&&String(q.p.ref).trim().toUpperCase()===L).map(q=>pnum(q.pg)))].sort((a,b)=>a-b);
   if(ps.length)h+=`<text x=${lx} y=${ly+12} class=mt${an}>→ p. ${ps.join(', ')}</text>`}}
 return h+'</g>'}

/* ===== colours ===== */
const lum=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return 0;const n=parseInt(m[1],16);return(.299*(n>>16)+.587*((n>>8)&255)+.114*(n&255))/255};
const dashOf=(ds,w)=>ds==='dash'?`${w*4} ${w*2.5}`:ds==='dot'?`0 ${w*2.4}`:'';
const strokeStyle=(col,wd,ds)=>{const da=dashOf(ds,wd||2);return(col?`stroke:${col};`:'')+(wd?`stroke-width:${wd};`:'')+(da?`stroke-dasharray:${da};`:'')+(ds==='dot'?'stroke-linecap:round;':'')};

/* ===== page: user shapes, components, wires ===== */
function pageMarkup(pg,live){
 const cs=S.comps.filter(c=>c.pg===pg),isSel=c=>live&&S.sel&&S.sel.k=='c'&&S.sel.id==c.id,cnt={},jc={},pi=Math.max(0,pnum(pg)-1);let h='';
 S.shapes.filter(s=>s.pg===pg||s.all).forEach(s=>{h+=shapeMarkup(s,live,live&&S.sel&&S.sel.k=='s'&&S.sel.id==s.id,pi)});
 cs.filter(c=>D[c.type].bg).forEach(c=>{h+=compSVG(c,live,isSel(c))});
 S.wires.forEach(w=>{const a=by(cid(w.a)),b=by(cid(w.b));if(!a||!b||a.pg!==pg)return;
  const na=tnorm(a,+w.a.split('.')[1]),nb=tnorm(b,+w.b.split('.')[1]),d=w.v&&w.v.length?viaPath(tp(w.a),tp(w.b),na,nb,w.v):route(tp(w.a),tp(w.b),na,nb),k=live&&S.tk[w.a],run=live&&S.run&&k,hot=run&&k.f>1e-6,sel=live&&S.sel&&S.sel.k=='w'&&S.sel.id==w.id;
  const air=airK(w.a),own=!!w.col,st=strokeStyle(sel?'':w.col,w.wd,w.ds),light=lum(w.col)>.72;
  if(air)h+=airWire(w,d,live,sel);   /* compressed-air line: own colour + tick marks (pneumatic.js) */
  else h+=`<path d="${d}" class="wire ${sel?'sel':own?'':hot?'hot':run&&Math.abs(k.v)>.01?'v':''}"${st?` style="${st}"`:''} />${hot&&!sel?`<path d="${d}" class=fl${light?' style="stroke:rgba(16,32,47,.6)"':''} />`:''}${live?`<path d="${d}" class=hit data-w=${w.id} />`:''}`;
  [w.a,w.b].forEach(q=>{cnt[q]=(cnt[q]||0)+1;if(!(q in jc))jc[q]=w.col||(air?(airBar(q)>.05&&live?AIRC.on:AIRC.off):'')})});
 for(const k in cnt)if(cnt[k]>1){const p=tp(k);h+=`<circle class=jd cx=${p[0]} cy=${p[1]} r=3.5${jc[k]?` style="fill:${jc[k]}"`:''} />`}
 if(live&&S.wiring){const a=by(cid(S.wiring));if(a&&a.pg===pg){const n=tnorm(a,+S.wiring.split('.')[1]),v=S.wvia||[],e=wvSnap(S.m),st=airK(S.wiring)?'stroke:'+AIRC.on+';stroke-width:3':strokeStyle(S.defW.col,S.defW.wd);
  h+=`<path d="${'M'+viaPts(tp(S.wiring),n,v,e,null).map(q=>q[0]+' '+q[1]).join('L')}" class=wire stroke-dasharray="5 4" style="${st}" />`;
  v.forEach(q=>{h+=`<circle cx=${q[0]} cy=${q[1]} r=3.5 style="fill:#fff;stroke:var(--ac);stroke-width:1.6" />`});h+=`<circle cx=${e[0]} cy=${e[1]} r=4 style="fill:var(--ac);opacity:.55" />`}}
 cs.filter(c=>!D[c.type].bg).forEach(c=>{h+=compSVG(c,live,isSel(c))});
 if(live&&S.sel&&S.sel.k=='s'){const s=shp(S.sel.id);if(s&&(s.pg===pg||s.all))h+=handlesMarkup(s)}
 if(live&&S.sel&&S.sel.k=='w'){const w=S.wires.find(x=>x.id==S.sel.id),a=w&&by(cid(w.a));if(a&&a.pg===pg&&w.v)w.v.forEach((q,i)=>{h+=`<circle class=hnd data-wv=${w.id} data-vi=${i} cx=${q[0]} cy=${q[1]} r=${(matchMedia('(pointer:coarse)').matches?12:6)/S.z}><title>Drag to move this corner · double-click to remove it</title></circle>`})}
 return h}

/* ===== user-drawn shapes: line, rectangle, text, image / logo ===== */
const shp=id=>S.shapes.find(s=>s.id===id);
const _mc=document.createElement('canvas').getContext('2d');
function subst(t,pi){const pg=S.pages[pi]||{title:''};return String(t==null?'':t).replace(/\{(page|pages|title|project|dwgno|rev|date)\}/gi,(m,k)=>({page:pi+1,pages:S.pages.length,title:pg.title,project:S.tb.project,dwgno:S.tb.dwgNo,rev:S.tb.rev,date:S.tb.date})[k.toLowerCase()]||'')}
function textBox(s,pi){const lines=subst(s.text,pi).split('\n');_mc.font=`${s.it?'italic ':''}${s.bold?'bold ':''}${s.size}px Arial,Helvetica,sans-serif`;
 return{lines,w:Math.max(10,...lines.map(l=>_mc.measureText(l).width)),h:lines.length*s.size*1.2}}
function shapeBounds(s,pi){if(s.k==='circle')return{x:s.x-s.r,y:s.y-s.r,w:2*s.r,h:2*s.r};if(s.k==='line')return{x:Math.min(s.x1,s.x2),y:Math.min(s.y1,s.y2),w:Math.abs(s.x2-s.x1),h:Math.abs(s.y2-s.y1)};
 if(s.k==='text'){const b=textBox(s,pi);return{x:s.x,y:s.y,w:b.w,h:b.h}}return{x:s.x,y:s.y,w:s.w,h:s.h}}
function shapeMarkup(s,live,sel,pi){const col=s.col||'#10202f',wd=s.wd||2,da=dashOf(s.ds,wd),cap=s.ds==='dot'?' stroke-linecap=round':' stroke-linecap=round',id=`data-s=${s.id}`;let h='';
 const sd=da?` stroke-dasharray="${da}"`:'';
 if(s.k==='line'){h=`<line x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} stroke="${col}" stroke-width=${wd}${cap}${sd} />`;
  if(s.dim||s.ar){const dx=s.x2-s.x1,dy=s.y2-s.y1,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L,a=8+wd*1.5,b=a*.38,hd=(x,y,vx,vy)=>`<path d="M${x} ${y}L${x-vx*a+vy*b} ${y-vy*a-vx*b}L${x-vx*a-vy*b} ${y-vy*a+vx*b}Z" fill="${col}" stroke="none" />`;
   h+=hd(s.x2,s.y2,ux,uy);
   if(s.dim){let an=Math.atan2(dy,dx)*180/Math.PI;if(an>90||an<-90)an+=180;h+=hd(s.x1,s.y1,-ux,-uy)+`<path d="M${s.x1-uy*8} ${s.y1+ux*8}L${s.x1+uy*8} ${s.y1-ux*8}M${s.x2-uy*8} ${s.y2+ux*8}L${s.x2+uy*8} ${s.y2-ux*8}" stroke="${col}" stroke-width=1.2 />`+
    `<text transform="translate(${(s.x1+s.x2)/2} ${(s.y1+s.y2)/2}) rotate(${an})" y=-5 fill="${col}" style="font:12px Arial,Helvetica,sans-serif;text-anchor:middle">${Math.round(L/U*10)/10} mm</text>`}}
  if(live)h+=`<line x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} stroke=transparent stroke-width=14 ${id} class=shit />`;
  if(sel)h+=`<line x1=${s.x1} y1=${s.y1} x2=${s.x2} y2=${s.y2} class=shsel stroke-width=${wd+6} />`}
 else if(s.k==='rect'){h=`<rect x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill="${s.fill||'none'}" stroke="${col}" stroke-width=${wd}${sd} stroke-linejoin=round />`;
  if(live)h+=`<rect x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill=transparent stroke=transparent stroke-width=14 pointer-events="${s.fill?'all':'stroke'}" ${id} class=shit />`;
  if(sel)h+=`<rect x=${s.x-3} y=${s.y-3} width=${s.w+6} height=${s.h+6} class=selr />`}
 else if(s.k==='circle'){h=`<circle cx=${s.x} cy=${s.y} r=${s.r} fill="${s.fill||'none'}" stroke="${col}" stroke-width=${wd}${sd} />`;
  if(live)h+=`<circle cx=${s.x} cy=${s.y} r=${s.r} fill=transparent stroke=transparent stroke-width=14 pointer-events="${s.fill?'all':'stroke'}" ${id} class=shit />`;
  if(sel)h+=`<circle cx=${s.x} cy=${s.y} r=${s.r+3} class=selr />`}
 else if(s.k==='img'){h=`<image href="${esc(s.src)}" x=${s.x} y=${s.y} width=${s.w} height=${s.h} preserveAspectRatio="none" style="pointer-events:none" />`;
  if(live)h+=`<rect x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill=transparent ${id} class=shit />`;
  if(sel)h+=`<rect x=${s.x-3} y=${s.y-3} width=${s.w+6} height=${s.h+6} class=selr />`}
 else if(s.k==='text'){const b=textBox(s,pi),ax=s.al==='center'?b.w/2:s.al==='right'?b.w:0,an=s.al==='center'?'middle':s.al==='right'?'end':'start';
  h=`<g transform="translate(${s.x} ${s.y}) rotate(${s.rot||0})"><text y=${s.size*.9} fill="${col}" style="font:${s.it?'italic ':''}${s.bold?'700':'400'} ${s.size}px Arial,Helvetica,sans-serif;text-anchor:${an};white-space:pre">`+
   b.lines.map((l,i)=>`<tspan x=${ax} dy=${i?s.size*1.2:0}>${esc(l)||' '}</tspan>`).join('')+'</text>'+
   (live?`<rect x=-3 y=-3 width=${b.w+6} height=${b.h+6} fill=transparent ${id} class=shit />`:'')+(sel?`<rect x=-4 y=-4 width=${b.w+8} height=${b.h+8} class=selr />`:'')+'</g>'}
 return h}
function handlesMarkup(s){const r=(matchMedia('(pointer:coarse)').matches?14:8)/S.z,H=(x,y,n)=>`<circle class=hnd data-hs=${s.id} data-hd=${n} cx=${x} cy=${y} r=${r} />`;
 if(s.k==='line')return H(s.x1,s.y1,'p1')+H(s.x2,s.y2,'p2');
 if(s.k==='circle')return H(s.x+s.r,s.y,'r')+H(s.x-s.r,s.y,'r')+H(s.x,s.y-s.r,'r')+H(s.x,s.y+s.r,'r');
 if(s.k==='rect'||s.k==='img')return H(s.x,s.y,'nw')+H(s.x+s.w,s.y,'ne')+H(s.x,s.y+s.h,'sw')+H(s.x+s.w,s.y+s.h,'se');return''}

/* ===== sheet: paper, optional frame with zone markers, working grid ===== */
function sheetMarkup(pi,clean){
 const[W,H]=paperPx(),m=10*U;
 let h=`<rect x=0 y=0 width=${W} height=${H} fill="#fff" stroke="#9fb0c0" stroke-width=1 />`;
 if(!clean&&S.grid!==0)h+=`<defs><pattern id=gp width=${GRID} height=${GRID} patternUnits=userSpaceOnUse><circle r=.9 fill="#bcc8d4" /></pattern></defs><rect x=${m} y=${m} width=${W-2*m} height=${H-2*m} fill="url(#gp)" />`;
 if(S.tb.frame===0)return h;
 h+=`<rect x=${m} y=${m} width=${W-2*m} height=${H-2*m} fill=none stroke="#10202f" stroke-width=2.2 />`;
 const nC=Math.max(2,Math.round((W/U-20)/50)),nR=Math.max(2,Math.round((H/U-20)/50)),cw=(W-2*m)/nC,rh=(H-2*m)/nR;
 for(let i=0;i<nC;i++){const cx=m+cw*(i+1/2);if(i){const x=m+cw*i;h+=`<path d="M${x} ${m-12}V${m}M${x} ${H-m}V${H-m+12}" stroke="#10202f" stroke-width=1 />`}h+=`<text class=zn x=${cx} y=${m-4}>${i+1}</text><text class=zn x=${cx} y=${H-m+11}>${i+1}</text>`}
 for(let i=0;i<nR;i++){const cy=m+rh*(i+1/2),ch=String.fromCharCode(65+i);if(i){const y=m+rh*i;h+=`<path d="M${m-12} ${y}H${m}M${W-m} ${y}H${W-m+12}" stroke="#10202f" stroke-width=1 />`}h+=`<text class=zn x=${m-6} y=${cy+3}>${ch}</text><text class=zn x=${W-m+6} y=${cy+3}>${ch}</text>`}
 return h}

/* ===== symbol previews (library tiles, PDF parts list) ===== */
function iconParts(type){const d=D[type],c=mk(type),bb=bbox(d,c),pad=8;
 const inner=d.icon||stubs(d)+d.g(c,null,d.cl?d.cl(c):0)+d.t.filter(t=>!hidT(t)).map(t=>`<circle class=term cx=${t[0]} cy=${t[1]} r=4 />`).join('');
 return{vb:d.icon?[-36,-24,72,48]:[bb[0]-pad,bb[1]-pad,bb[2]+2*pad,bb[3]+2*pad],inner}}
