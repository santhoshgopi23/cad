/* ElectroSim v8 – PLC with configurable I/O (DI / DO / AI / AO), ladder logic, tags and analog instructions.
   Channel counts live in the part's properties (nDI 0-16, nDO 0-16, nAI 0-8, nAO 0-4) and can also be changed inside the ladder editor.
   Terminal numbers are fixed per channel (so wires survive a change of count); unused channels are hidden terminals.
   Ladder program is stored in c.prog = {rungs:[{cm, c:{k:'s',ch:[…]}, o:[…]}]}, symbol names in c.tags = {address:name}
   condition nodes: {k:'no'|'nc',a}  {k:'cmp',a:'AI0',op:'>',v:50}  series {k:'s',ch}  parallel {k:'p',ch:[series rows]}
   output nodes:    {k:'out'|'set'|'rst',a}  {k:'ton',a:'T0',v:seconds}  {k:'ctu',a:'C0',v:count}  {k:'ao',a:'AO0',src:'const'|'AI0',v:percent}
   Analog values are 0-100 % of the signal span (0-10 V or 4-20 mA).
   Loaded after parts2.js. Double-click the PLC on the sheet (or use Properties) to open the editor. */
'use strict';
const PW=new WeakMap();                       /* node -> {i,o} power in / out from the last scan (live display) */
let plcTap=null;

/* ---------- configuration ---------- */
const PMAX={DI:16,DO:16,AI:8,AO:4},NTERM=47,AOLIM=12;       /* AOLIM = compliance voltage of a 4-20 mA output */
const PPRE=[['8 DI / 8 DO',8,8,0,0],['8 DI / 8 DO + 2 AI / 1 AO',8,8,2,1],['16 DI / 16 DO',16,16,0,0],['16 DI / 16 DO + 4 AI / 2 AO',16,16,4,2],['4 DI / 4 DO (micro)',4,4,0,0],['Custom']];
const NOPT=m=>Array.from({length:m+1},(_,i)=>String(i));
const pn=(c,k,d)=>{const v=parseInt(c.p['n'+k],10);return Number.isFinite(v)?Math.max(0,Math.min(PMAX[k],v)):d};
const plCfg=c=>({DI:pn(c,'DI',8),DO:pn(c,'DO',8),AI:pn(c,'AI',0),AO:pn(c,'AO',0),ai:c.p.aiT==='4-20 mA'?'mA':'V',ao:c.p.aoT==='4-20 mA'?'mA':'V'});
const aDI=i=>'I'+(i>>3)+'.'+(i&7),aDO=i=>'Q'+(i>>3)+'.'+(i&7);
/* terminal number of every channel (first 8 DI / DO keep the numbers of v7 so old projects still load) */
const TX={DI:i=>i<4?2+i:i<8?11+i-4:19+i-8,DO:i=>i<4?6+i:i<8?15+i-4:27+i-8,AI:i=>35+i,AO:i=>43+i};
const LAYS={};
function plLay(cf){const key=[cf.DI,cf.DO,cf.AI,cf.AO].join('.');if(LAYS[key])return LAYS[key];
 const t=Array.from({length:NTERM},()=>[0,0,'','h']);
 t[0]=[-40,-60,'L+'];t[1]=[-40,-40,'M'];
 let y=-20;for(let i=0;i<cf.DI;i++,y+=20)t[TX.DI(i)]=[-40,y,aDI(i),'o'];
 if(cf.DI&&cf.AI)y+=20;
 for(let i=0;i<cf.AI;i++,y+=20)t[TX.AI(i)]=[-40,y,'AI'+i,'o'];
 let z=-40;if(cf.DO)t[10]=[40,-60,'1L','o'];
 for(let i=0;i<cf.DO;i++,z+=20)t[TX.DO(i)]=[40,z,aDO(i),'o'];
 if(cf.DO&&cf.AO)z+=20;
 for(let i=0;i<cf.AO;i++,z+=20)t[TX.AO(i)]=[40,z,'AO'+i,'o'];
 const bot=Math.max(40,y,z);return LAYS[key]={t,bot,bb:[-46,-106,92,bot+116]}}
const plVal=(pl,a)=>a[0]==='A'?(pl.an&&pl.an[a])||0:pl.v[a]||0;
const plCmp=(x,op,y)=>op==='>'?x>y:op==='>='?x>=y:op==='<'?x<y:op==='<='?x<=y:op==='<>'?Math.abs(x-y)>1e-9:Math.abs(x-y)<1e-9;
const plEng=(cf,k,p)=>(k==='ai'?cf.ai:cf.ao)==='mA'?(4+p*.16).toFixed(1)+' mA':(p/10).toFixed(1)+' V';

/* ---------- scan ---------- */
function plcEv(n,i,pl){let o;
 if(n.k==='s'){o=i;n.ch.forEach(q=>{o=plcEv(q,o,pl)})}
 else if(n.k==='p'){o=0;n.ch.forEach(q=>{if(plcEv(q,i,pl))o=1})}
 else if(n.k==='cmp')o=i&&plCmp(plVal(pl,n.a),n.op,+n.v)?1:0;
 else{const v=pl.b[n.a]?1:0;o=i&&(n.k==='no'?v:!v)?1:0}
 PW.set(n,{i,o});return o}
function plcExec(o,p,pl){const b=pl.b,v=pl.v,a=o.a;PW.set(o,{i:p,o:p});
 if(o.k==='out')b[a]=p?1:0;
 else if(o.k==='set'){if(p)b[a]=1}
 else if(o.k==='rst'){if(p){b[a]=0;if(/^[TC]/.test(a))v[a]=0}}
 else if(o.k==='ton'){if(p){v[a]=Math.min(o.v,(v[a]||0)+DT);b[a]=v[a]>=o.v-1e-9?1:0}else{v[a]=0;b[a]=0}}
 else if(o.k==='ctu'){if(p&&!pl.e[a])v[a]=(v[a]||0)+1;pl.e[a]=p?1:0;b[a]=(v[a]||0)>=o.v?1:0}
 else if(o.k==='ao'){if(p){const x=o.src&&o.src!=='const'?plVal(pl,o.src):o.v;pl.an[a]=Math.max(0,Math.min(100,+x||0))}}}
function plcScan(c){const s=c.s,cf=plCfg(c),fr=s.pl&&s.pl.fr?s.pl.fr:{};
 if(!s.pw||c.p.mode!=='RUN'){s.pl={b:{},v:{},e:{},fr,an:{}};return}
 const pl=s.pl||(s.pl={b:{},v:{},e:{},fr,an:{}}),b=pl.b;if(!pl.an)pl.an={};
 if(typeof hmiWrite==='function')hmiWrite(c,pl);   /* HMI panel: push buttons / toggles -> M and I bits */
 for(let i=0;i<cf.DI;i++){const a=aDI(i);b[a]=(s.in&&s.in[i])||pl.fr[a]?1:0}
 for(let i=0;i<cf.AI;i++){const a='AI'+i;pl.an[a]=typeof pl.fr[a]==='number'?pl.fr[a]:(s.ai&&s.ai[i])||0}
 if(c.prog&&c.prog.rungs)c.prog.rungs.forEach(r=>{const p=plcEv(r.c,1,pl);r.o.forEach(o=>plcExec(o,p,pl))})}
const plcBits=(c,ch,n)=>n?Array.from({length:n},(_,i)=>(c.s.pl&&c.s.pl.b[ch+(i>>3)+'.'+(i&7)])?1:0).join('').replace(/(.{8})(?=.)/g,'$1 '):'-';
const plcAn=(c,ch,n)=>Array.from({length:n},(_,i)=>Math.round((c.s.pl&&c.s.pl.an&&c.s.pl.an[ch+i])||0)+'%').join(' ');
const plWalk=(n,f)=>{f(n);if(n.ch)n.ch.forEach(q=>plWalk(q,f))};

/* every address the current configuration really has */
function plAdrs(c){const cf=plCfg(c),A={I:[],Q:[],M:[],T:[],C:[],AI:[],AO:[]};
 for(let i=0;i<cf.DI;i++)A.I.push(aDI(i));for(let i=0;i<cf.DO;i++)A.Q.push(aDO(i));
 for(let i=0;i<16;i++)A.M.push('M'+(i>>3)+'.'+(i&7));for(let i=0;i<8;i++)A.T.push('T'+i),A.C.push('C'+i);
 for(let i=0;i<cf.AI;i++)A.AI.push('AI'+i);for(let i=0;i<cf.AO;i++)A.AO.push('AO'+i);return A}
const plTag=(c,a)=>(c.tags&&c.tags[a])||'';

/* wires that end on a terminal that no longer exists are removed */
function plcPrune(c){const t=dd(c).t,bad=k=>{const[id,i]=String(k).split('.');return +id===c.id&&t[+i]&&hidT(t[+i])},n0=S.wires.length;
 S.wires=S.wires.filter(w=>!(bad(w.a)||bad(w.b)));return n0-S.wires.length}
/* called from Properties (and the ladder editor) after a setting changed; true = redraw the properties panel */
function plcChg(c,k){
 if(k==='preset'){const pr=PPRE.find(q=>q[0]===c.p.preset);if(pr&&pr.length>1)[c.p.nDI,c.p.nDO,c.p.nAI,c.p.nAO]=pr.slice(1)}
 else if(/^n(DI|DO|AI|AO)$/.test(k)){const m=PPRE.find(q=>q.length>1&&q[1]==c.p.nDI&&q[2]==c.p.nDO&&q[3]==c.p.nAI&&q[4]==c.p.nAO);c.p.preset=m?m[0]:'Custom'}
 else return false;
 const n=plcPrune(c);if(n)toast(n+' wire'+(n>1?'s':'')+' on removed terminals deleted');
 S.dirty=1;if(typeof commit==='function')commit();return true}

/* ---------- the part ---------- */
const L0=plLay({DI:8,DO:8,AI:0,AO:0});
D.plc={n:'PLC (configurable DI / DO / AI / AO, ladder logic)',ds:'PLC with a selectable number of digital and analog inputs / outputs and a ladder-logic editor',cat:'Automation',pre:'PLC',hs:1,sx:34,t:L0.t,bb:L0.bb,
 p:{V:[24,'V','Supply voltage'],mode:['RUN','','Mode',['RUN','STOP']],preset:[PPRE[0][0],'','I/O preset',PPRE.map(q=>q[0])],
  nDI:[8,'','Digital inputs (DI)',NOPT(PMAX.DI)],nDO:[8,'','Digital outputs (DO)',NOPT(PMAX.DO)],nAI:[0,'','Analog inputs (AI)',NOPT(PMAX.AI)],nAO:[0,'','Analog outputs (AO)',NOPT(PMAX.AO)],
  aiT:['0-10 V','','AI signal type',['0-10 V','4-20 mA']],aoT:['0-10 V','','AO signal type',['0-10 V','4-20 mA']]},
 dyn:c=>{const L=plLay(plCfg(c));return L.d||(L.d=Object.assign(Object.create(D.plc),{t:L.t,bb:L.bb}))},
 chg:plcChg,
 clk:(c,a)=>{if(a==='mode'){c.p.mode=c.p.mode==='RUN'?'STOP':'RUN';S.dirty=1}},
 /* element order: supply, DI…, DO…, AI…, then (source, leak) per AO */
 el:c=>{const cf=plCfg(c),s=c.s,pl=s.pl||{},b=pl.b||{},an=pl.an||{},on=s.pw&&c.p.mode==='RUN',E=[RR(0,1,480)];
  for(let i=0;i<cf.DI;i++)E.push(RR(TX.DI(i),1,6000));
  for(let i=0;i<cf.DO;i++)E.push(RR(TX.DO(i),10,s.pw&&b[aDO(i)]?.005:1e9));
  for(let i=0;i<cf.AI;i++)E.push(RR(TX.AI(i),1,cf.ai==='mA'?250:1e5));
  for(let i=0;i<cf.AO;i++){const t=TX.AO(i),pc=on?Math.max(0,Math.min(100,an['AO'+i]||0)):0;
   if(cf.ao==='V')E.push({k:'V',a:t,b:1,v:pc/10});
   else E.push(s.al&&s.al[i]?{k:'V',a:t,b:1,v:AOLIM}:{k:'I',a:1,b:t,i:(on?4+pc*.16:0)/1e3});
   E.push(RR(t,1,1e9))}
  return E},
 sim:(c,E)=>{const cf=plCfg(c),s=c.s,V=c.p.V,pw=Math.abs(E[0].v2)>=.7*V,on=pw&&c.p.mode==='RUN',an=(s.pl&&s.pl.an)||{};let ch=0,k=1;
  if(pw!==!!s.pw){s.pw=pw;ch=1}
  s.in=[];for(let i=0;i<cf.DI;i++)s.in.push(E[k++].v2>=.5*V);
  k+=cf.DO;s.ai=[];s.aiw=[];
  for(let i=0;i<cf.AI;i++){const v=E[k++].v2;let pc;if(cf.ai==='mA'){const mA=v/250*1e3;pc=(mA-4)/16*100;s.aiw[i]=mA<3.65}else pc=v/10*100;s.ai.push(Math.max(0,Math.min(100,pc)))}
  if(!Array.isArray(s.al))s.al=[];
  for(let i=0;i<cf.AO;i++){const src=E[k++],lk=E[k++];
   if(cf.ao==='mA'){const want=(on?4+Math.max(0,Math.min(100,an['AO'+i]||0))*.16:0)/1e3,io=src.cur;let nl=s.al[i]?1:0;
    if(!nl&&Math.abs(lk.v2)>AOLIM+.01)nl=1;else if(nl&&Math.abs(io)>=want*.999)nl=0;
    if(nl!==(s.al[i]?1:0)){s.al[i]=nl;ch=1}}}
  return ch},
 tk:c=>plcScan(c),
 st:c=>{const cf=plCfg(c);return!c.s.pw?'NO POWER':c.p.mode!=='RUN'?'STOP':'RUN  '+(cf.DI?'I '+plcBits(c,'I',cf.DI)+'  ':'')+(cf.DO?'Q '+plcBits(c,'Q',cf.DO):'')+(cf.AI?'  AI '+plcAn(c,'AI',cf.AI):'')+(cf.AO?'  AO '+plcAn(c,'AO',cf.AO):'')},
 msg:c=>{const r=[],s=c.s,cf=plCfg(c);
  if(s.pw&&c.p.mode==='RUN'&&!(c.prog&&c.prog.rungs.some(q=>q.o.length)))r.push(['wa',`${c.label}: no ladder program – double-click the PLC to edit`]);
  if(s.pw&&c.p.mode!=='RUN')r.push(['wa',`${c.label}: PLC is in STOP mode`]);
  if(c.prog&&c.prog.rungs){const A=plAdrs(c),ok=new Set(Object.values(A).flat()),bad=new Set();
   c.prog.rungs.forEach(q=>{plWalk(q.c,n=>{if(n.a&&!ok.has(n.a))bad.add(n.a);if(n.src&&n.src!=='const'&&!ok.has(n.src))bad.add(n.src)});q.o.forEach(n=>{if(n.a&&!ok.has(n.a))bad.add(n.a);if(n.src&&n.src!=='const'&&!ok.has(n.src))bad.add(n.src)})});
   if(bad.size)r.push(['wa',`${c.label}: program uses ${[...bad].slice(0,4).join(', ')}${bad.size>4?' …':''} – not fitted on this PLC (change the I/O count)`])}
  if(s.pw&&cf.ai==='mA'&&s.aiw)s.aiw.forEach((w,i)=>{if(w)r.push(['wa',`${c.label}: AI${i} at or below 3.6 mA – wire break or no 4-20 mA signal`])});
  s.al&&s.al.forEach((w,i)=>{if(w)r.push(['wa',`${c.label}: AO${i} cannot drive its 4-20 mA loop (load too high / open circuit)`])});
  return r},
 pp:c=>{const cf=plCfg(c),rg=(n,f)=>n?(n>1?f(0)+' – '+f(n-1):f(0)):'none';
  return`<p><button class=pri data-a=plc>✎ Edit ladder logic</button> <button data-clk=mode>${c.p.mode==='RUN'?'■ Set STOP':'▶ Set RUN'}</button></p>
  <div class=sec>I/O map</div><table class=iomap><tr><td>Digital in</td><td>${rg(cf.DI,aDI)}</td></tr><tr><td>Digital out</td><td>${rg(cf.DO,aDO)}</td></tr><tr><td>Analog in</td><td>${rg(cf.AI,i=>'AI'+i)}${cf.AI?' · '+(cf.ai==='mA'?'4-20 mA':'0-10 V'):''}</td></tr><tr><td>Analog out</td><td>${rg(cf.AO,i=>'AO'+i)}${cf.AO?' · '+(cf.ao==='mA'?'4-20 mA':'0-10 V'):''}</td></tr></table>
  <p class=mu>Pick a preset or set each count above – terminals appear / disappear on the symbol (wires on removed terminals are deleted). Double-click the PLC on the sheet, or click its RUN / STOP badge.</p>
  <p class=mu><b>Wiring:</b> L+ / M to 24 V DC. <b>DI</b>: 24 V through a switch to the input (sinking). <b>DO</b>: relay contact between Q and the common <b>1L</b> – feed 1L from the supply, wire each load from its Q terminal. <b>AI</b>: signal between AIx and M (0-10 V, or 4-20 mA through a 250 Ω shunt) – e.g. Signal Injector or Potentiometer. <b>AO</b>: output between AOx and M.</p>`},
 g:c=>{const s=c.s,cf=plCfg(c),L=plLay(cf),pl=s.pl||{},b=pl.b||{},an=pl.an||{},fr=pl.fr||{},run=s.pw&&c.p.mode==='RUN';
  let h=`<rect x=-34 y=-96 width=68 height=${L.bot+96} rx=3 class=s /><text y=-85 class=tx>PLC</text>`+
   `<g data-clk=mode style="cursor:pointer"><rect x=-16 y=-79 width=32 height=11 rx=3 style="fill:${run?'var(--ok)':s.pw?'var(--wa)':'transparent'};stroke:${run?'var(--ok)':s.pw?'var(--wa)':'var(--mu)'};stroke-width:1" /><text y=-70.5 class=mt style="font-size:7.5px;font-weight:700;pointer-events:none;fill:${s.pw?'#fff':'var(--mu)'}">${c.p.mode==='RUN'?'RUN':'STOP'}</text></g>`+
   (S.run&&!s.pw?`<text y=-62 class=mt style="font-size:6.5px">no power</text>`:'');
  L.t.forEach(([x,y,n,fl],i)=>{if(fl&&fl.includes('h'))return;const lf=x<0;h+=`<text x=${lf?-30:30} y=${y+3} class=mt style="text-anchor:${lf?'start':'end'};font-size:9px">${n}</text>`;
   if(/^[IQ]\d\./.test(n)){const on=b[n],q=n[0]==='Q';h+=`<circle cx=${lf?-6:6} cy=${y} r=3.5 style="fill:${on?(q?'var(--ok)':'#f5c542'):'transparent'};stroke:${fr[n]?'var(--wa)':'var(--mu)'};stroke-width:${fr[n]?2.2:1}"/>`}
   else if(/^A[IO]\d/.test(n)){const p=(an[n]||0)/100;h+=`<circle cx=${lf?-6:6} cy=${y} r=3.5 style="fill:#4aa3ff;fill-opacity:${run?.12+.88*p:0};stroke:${typeof fr[n]==='number'?'var(--wa)':'var(--mu)'};stroke-width:${typeof fr[n]==='number'?2.2:1}"/>`}});
  return h+`<text y=${L.bot-8} class=mt style="font-size:7px">double-click: ladder</text>`}};

/* ---------- ladder editor (TIA Portal style) ----------
   Layout: project tree (left) · networks (centre) · Instructions task card (right) · Properties + Watch (bottom).
   Drag an instruction from the task card onto a highlighted slot of a network; drag a placed element to move it. */
const ADN={I:'Inputs',Q:'Outputs',M:'Memory bits',T:'Timers (done bit)',C:'Counters (done bit)',AI:'Analog inputs (%)',AO:'Analog outputs (%)'};
const GRP={no:['I','Q','M','T','C'],nc:['I','Q','M','T','C'],cmp:['AI','AO','T','C'],out:['Q','M'],set:['Q','M'],rst:['Q','M','T','C'],ton:['T'],ctu:['C'],ao:['AO']};
const KN={no:'NO contact',nc:'NC contact',cmp:'Compare (analog / timer / counter value)',p:'Parallel branch',out:'Output coil',set:'SET coil (latch)',rst:'RESET coil (unlatch / reset T, C)',ton:'TON – on-delay timer',ctu:'CTU – up counter',ao:'MOVE to analog output'};
const OPS=['>','>=','=','<=','<','<>'];
const PLPAL=[['Bit logic',[['no','┤ ├','Normally open contact','C'],['nc','┤/├','Normally closed contact','N'],['out','( )','Output coil','O'],['set','(S)','Set output (latch)','S'],['rst','(R)','Reset output / timer / counter','R']]],
 ['Comparator',[['cmp','==','Equal','A','='],['cmp','<>','Not equal','','<>'],['cmp','>','Greater than','','>'],['cmp','>=','Greater or equal','','>='],['cmp','<','Less than','','<'],['cmp','<=','Less or equal','','<=']],1],
 ['Timers',[['ton','TON','On-delay timer','T']]],['Counters',[['ctu','CTU','Up counter','U']]],['Move',[['ao','MOVE','Write a value to an analog output','M']]]];
const CW=84,RH=56,OW=150,LX=10;
let ED=null,plDlg=null,plLast=0,DG=null,plSwallow=0,plZm=1;
const newRung=()=>({t:'',cm:'',c:{k:'s',ch:[]},o:[]});
const isOut=n=>'out set rst ton ctu ao'.includes(n.k);
const isCon=n=>n.k==='no'||n.k==='nc';
const isBox=n=>n.k==='ton'||n.k==='ctu'||n.k==='ao';
const plR=()=>ED.c.prog.rungs[ED.ri];
const plPL=()=>{const s=ED.c.s;return s.pl||(s.pl={b:{},v:{},e:{},fr:{},an:{}})};
const $p=id=>document.getElementById(id);
function plLoc(arr,n,par){for(let i=0;i<arr.length;i++){const q=arr[i];if(q===n)return[arr,i,par];if(q.ch){const f=plLoc(q.ch,n,q);if(f)return f}}return null}
const plFind=(r,n)=>plLoc(r.c.ch,n,r.c)||plLoc(r.o,n,null);
function plNorm(arr){for(let i=0;i<arr.length;i++){const n=arr[i];if(n.k!=='p')continue;
 n.ch.forEach(r=>plNorm(r.ch));n.ch=n.ch.filter(r=>r.ch.length);
 if(!n.ch.length)arr.splice(i--,1);else if(n.ch.length===1){arr.splice(i,1,...n.ch[0].ch);i--}}}
function plSize(n){if(n.k==='s'){let w=0,h=1;n.ch.forEach(c=>{const s=plSize(c);w+=s[0];h=Math.max(h,s[1])});return[w,h]}
 if(n.k==='p'){let w=1,h=0;n.ch.forEach(r=>{const s=plSize(r);w=Math.max(w,s[0]);h+=s[1]});return[w,h]}return[1,1]}
const tagOf=a=>ED&&a?plTag(ED.c,a):'';
const adrOpts=(k,cur)=>{const A=plAdrs(ED.c),g=GRP[k],all=g.flatMap(x=>A[x]);
 return(all.includes(cur)?'':`<option value="${esc(cur)}" selected>${esc(cur)} (not fitted)</option>`)+
  g.filter(x=>A[x].length).map(x=>`<optgroup label="${ADN[x]}">${A[x].map(a=>{const t=tagOf(a);return`<option value="${a}" ${a===cur?'selected':''}>${a}${t?' – '+esc(t):''}</option>`}).join('')}</optgroup>`).join('')};
function plDef(k,used){const A=plAdrs(ED.c),pick=(...gs)=>{for(const g of gs){const a=A[g].find(x=>!used.has(x))||A[g][0];if(a)return a}return'M0.0'};
 return k==='ton'?pick('T'):k==='ctu'?pick('C'):k==='out'?pick('Q','M'):k==='set'||k==='rst'?pick('Q','M'):k==='ao'?pick('AO'):k==='cmp'?pick('AI','C'):A.I[0]||A.M[0]}

/* ---- undo / redo (snapshots of the program and the tag names) ---- */
const plSnapStr=()=>JSON.stringify({r:ED.c.prog.rungs,t:ED.c.tags});
function plPush(){const s=plSnapStr();if(ED.hs[ED.hi]===s)return;ED.hs.length=ED.hi+1;ED.hs.push(s);if(ED.hs.length>80)ED.hs.shift();ED.hi=ED.hs.length-1}
function plUndo(d){const j=ED.hi+d;if(j<0||j>=ED.hs.length){toast(d<0?'Nothing to undo':'Nothing to redo');return}
 ED.hi=j;const o=JSON.parse(ED.hs[j]);ED.c.prog.rungs=o.r;ED.c.tags=o.t||{};ED.sel=null;ED.ri=Math.min(ED.ri,o.r.length-1);plIO();plView();S.dirty=1;commit()}

/* ---- drawing one network ---- */
function plRungSVG(r,ri){
 const ni=n=>ED.nodes.push(n)-1,Wr=(x1,y1,x2,y2,i,sd)=>`<path class=lw data-i=${i} data-s=${sd} d="M${x1} ${y1}L${x2} ${y2}"/>`,
  sel=n=>ED.sel===n&&ri===ED.ri,[cw,chh]=plSize(r.c),cols=Math.max(cw,3),rows=Math.max(chh,r.o.length,1),outX=LX+cols*CW,xr=outX+OW+8,Hh=rows*RH,
  tg=(a,x,y)=>{const t=tagOf(a);return t?`<text class=tg x=${x} y=${y} text-anchor=middle>${esc(t.length>13?t.slice(0,12)+'…':t)}</text>`:''};
 let SL='';
 const sl=(t,x,y,w,h,ref,kind)=>{const i=ED.slots.push({ri,t,ref})-1;SL+=`<rect class="sl ${kind}" data-sl=${i} x=${x} y=${y} width=${w} height=${h} rx=3 />`};
 const leaf=(n,x,y,first)=>{const i=ni(n),m=x+CW/2,cy=y+RH/2,hit=`<rect class=hit data-i=${i} x=${x} y=${y} width=${CW} height=${RH} />`+(sel(n)?`<rect class=selb x=${x+3} y=${y+3} width=${CW-6} height=${RH-6} />`:'');
  sl('a',x+CW-26,y+5,22,RH-22,n,'c');if(first)sl('b',x+2,y+5,22,RH-22,n,'c');sl('br',x+16,y+RH-16,CW-32,13,n,'c');
  if(n.k==='cmp')return hit+Wr(x,cy,m-24,cy,i,'i')+Wr(m+24,cy,x+CW,cy,i,'o')+`<rect class=lc data-i=${i} data-s=o x=${m-24} y=${cy-15} width=48 height=30 rx=2 />`+
   `<text data-i=${i} x=${m} y=${cy-20} text-anchor=middle>${n.a}</text><text data-i=${i} x=${m} y=${cy-2} text-anchor=middle style="font-weight:700">${esc(n.op)}</text><text data-i=${i} x=${m} y=${cy+10} text-anchor=middle style="font-size:10px">${+n.v}</text>`+tg(n.a,m,cy+26);
  return hit+Wr(x,cy,m-8,cy,i,'i')+Wr(m+8,cy,x+CW,cy,i,'o')+`<path class=lc data-i=${i} data-s=o d="M${m-8} ${cy-13}V${cy+13}M${m+8} ${cy-13}V${cy+13}${n.k==='nc'?`M${m-11} ${cy+11}L${m+11} ${cy-11}`:''}"/>`+
   `<text data-i=${i} x=${m} y=${cy-19} text-anchor=middle>${n.a}</text>`+tg(n.a,m,cy+26)};
 const node=(n,x,y,top)=>{
  if(n.k==='s'){let h='',cx=x;n.ch.forEach((q,qi)=>{h+=node(q,cx,y,top&&qi===0);cx+=plSize(q)[0]*CW});return h}
  if(n.k!=='p')return leaf(n,x,y,top);
  const i=ni(n),W=plSize(n)[0],xe=x+W*CW,H=plSize(n)[1]*RH;let h=`<rect class=hit data-i=${i} x=${x-7} y=${y} width=14 height=${H} /><rect class=hit data-i=${i} x=${xe-7} y=${y} width=14 height=${H} />`,yy=y,c0=y+RH/2,c1=c0;
  if(sel(n))h+=`<rect class=selb x=${x-6} y=${y+2} width=${xe-x+12} height=${H-4} />`;
  sl('a',xe-9,y+5,18,RH-22,n,'c');if(top)sl('b',x-9,y+5,18,RH-22,n,'c');
  n.ch.forEach(row=>{const ri2=ni(row),[rw,rh]=plSize(row),cy=yy+RH/2;h+=node(row,x,yy,false);if(rw<W)h+=Wr(x+rw*CW,cy,xe,cy,ri2,'o');if(!rw)h+=Wr(x,cy,xe,cy,ri2,'o');c1=cy;yy+=rh*RH});
  return h+Wr(x,c0,x,c1,i,'i')+Wr(xe,c0,xe,c1,i,'o')};
 const ir=ni(r.c);let h=`<path class=rail d="M${LX} 0V${Hh}"/>`+node(r.c,LX,0,true)+Wr(LX+cw*CW,RH/2,outX,RH/2,ir,'o');
 if(!r.c.ch.length){sl('end',LX+8,4,outX-LX-16,RH-8,null,'c');h+=`<text class=phx x=${LX+(outX-LX)/2} y=${RH/2-7} text-anchor=middle>⟶ drag contacts / compare here</text>`}
 const outs=r.o.length?r.o:[null];
 if(r.o.length>1)h+=Wr(outX,RH/2,outX,RH/2+(r.o.length-1)*RH,ir,'o');
 if(!r.o.length){sl('oe',outX,4,OW,RH-8,null,'o');h+=`<rect class=phb x=${outX+30} y=${RH/2-15} width=${OW-60} height=30 rx=4 /><text class=phx x=${outX+OW/2} y=${RH/2+4} text-anchor=middle>drag a coil here</text>`}
 outs.forEach((o,k)=>{if(!o)return;const i=ni(o),y=k*RH,cy=y+RH/2,m=outX+OW/2;
  sl('ob',outX,y+2,OW,RH/2-2,o,'o');sl('oa',outX,y+RH/2,OW,RH/2-2,o,'o');
  h+=`<rect class=hit data-i=${i} x=${outX} y=${y} width=${OW+8} height=${RH} />`+(sel(o)?`<rect class=selb x=${outX+4} y=${y+3} width=${OW} height=${RH-6} />`:'');
  if(isBox(o)){const hw=o.k==='ao'?56:46,l2=o.k==='ton'?'0.0 / '+o.v+' s':o.k==='ctu'?'0 / '+o.v:(o.src&&o.src!=='const'?o.src:(+o.v)+' %'),
    hd=o.k==='ao'?'MOVE → AO':o.k.toUpperCase()+(o.k==='ton'?'  Time':'  Int'),pin=o.k==='ton'?'IN':o.k==='ctu'?'CU':'EN';
   h+=Wr(outX,cy,m-hw,cy,i,'i')+`<rect class=bxh x=${m-hw} y=${cy-20} width=${hw*2} height=13 rx=3 /><rect class=lc data-i=${i} data-s=i x=${m-hw} y=${cy-20} width=${hw*2} height=40 rx=3 />`+
    `<text class=bxt data-i=${i} x=${m} y=${cy-10} text-anchor=middle>${hd}</text><text data-i=${i} x=${m} y=${cy+3} text-anchor=middle style="font-weight:700">${o.a}</text>`+
    `<text data-i=${i} data-tv="${o.a}|${esc(l2)}|${o.k}" x=${m} y=${cy+15} text-anchor=middle style="font-size:10px">${esc(l2)}</text>`+
    `<text class=pin x=${m-hw+4} y=${cy+3}>${pin}</text>`+(o.k==='ao'?'':`<text class=pin x=${m+hw-4} y=${cy+3} text-anchor=end>Q</text>`)+(o.k==='ao'?'':tg(o.a,m,cy+31))}
  else h+=Wr(outX,cy,m-14,cy,i,'i')+`<path class=lc data-i=${i} data-s=i d="M${m-8} ${cy-13}Q${m-17} ${cy} ${m-8} ${cy+13}M${m+8} ${cy-13}Q${m+17} ${cy} ${m+8} ${cy+13}"/>`+
    `<text data-i=${i} x=${m} y=${cy+4} text-anchor=middle>${o.k==='set'?'S':o.k==='rst'?'R':''}</text><text data-i=${i} x=${m} y=${cy-19} text-anchor=middle>${o.a}</text>`+tg(o.a,m,cy+26)});
 const W=(xr+14)*plZm,Hs=(Hh+12)*plZm;
 return`<svg width=${W} height=${Hs} viewBox="-2 -2 ${xr+14} ${Hh+12}">${h}${SL}</svg>`}

/* ---- the four views of the editor ---- */
function plView(){const P=ED.c.prog,v=ED.view;ED.nodes=[];ED.slots=[];
 [['plBody','main'],['plTags','tags'],['plCf','cfg'],['plPr','main']].forEach(([id,k])=>$p(id).hidden=v!==k);
 plDlg.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 plDlg.querySelectorAll('.pins,.ptb [data-ed]').forEach(b=>b.classList.toggle('dis',v!=='main'));
 const lbl=$p('plLbl');if(lbl)lbl.textContent=ED.c.label;
 if(v==='tags')return plTagsView();if(v==='cfg')return plCfgBar();
 $p('plBody').innerHTML=P.rungs.map((r,ri)=>`<div class="rg${ri===ED.ri?' cur':''}${r.col?' col':''}" data-r=${ri}><div class=rh><button data-rb=tog data-r=${ri} class=chev title="Collapse / expand the network">${r.col?'▸':'▾'}</button><b>Network ${ri+1}:</b><input class=rt data-rt=${ri} placeholder="Title…" value="${esc(r.t||'')}"><span class=sp></span><button data-rb=up data-r=${ri} title="Move up">↑</button><button data-rb=dn data-r=${ri} title="Move down">↓</button><button data-rb=dup data-r=${ri} title="Duplicate network (Ctrl+D)">⧉</button><button data-rb=del data-r=${ri} title="Delete network">✕</button></div>${r.col?'':`<input class=rc data-rc=${ri} placeholder="Comment…" value="${esc(r.cm||'')}"><div class=rs>${plRungSVG(r,ri)}</div>`}</div><button class=ins data-rb=ins data-r=${ri}><span>＋ Insert network</span></button>`).join('');
 plProps()}
function plUse(){const m={};ED.c.prog.rungs.forEach(r=>{plWalk(r.c,n=>{if(n.a)m[n.a]=(m[n.a]||0)+1});r.o.forEach(o=>{if(o.a)m[o.a]=(m[o.a]||0)+1})});return m}
function plTagsView(){const A=plAdrs(ED.c),U=plUse(),ty={I:'Bool',Q:'Bool',M:'Bool',T:'Timer (done bit)',C:'Counter (done bit)',AI:'Real (%)',AO:'Real (%)'};
 const old=$p('plTf'),f=old?old.value:'';
 $p('plTags').innerHTML=`<div class=tgh><b>PLC tag table</b><span class=mu>Give each address a name – it is shown in the ladder, the I/O strip and the HMI lists.</span><input id=plTf type=search placeholder="Filter…" value="${esc(f)}"></div>
  <table class=tgt><thead><tr><th>Name</th><th>Address</th><th>Data type</th><th>Used</th></tr></thead><tbody>`+
  Object.keys(ADN).flatMap(g=>A[g].map(a=>`<tr data-ta="${a}"><td><input data-tg="${a}" maxlength=24 value="${esc(plTag(ED.c,a))}" placeholder="${a}"></td><td><code>${a}</code></td><td>${ty[g]}</td><td>${U[a]||'–'}</td></tr>`)).join('')+`</tbody></table>`;
 plTagFilter()}
function plTagFilter(){const q=($p('plTf')||{value:''}).value.trim().toLowerCase();$p('plTags').querySelectorAll('tbody tr').forEach(tr=>{const a=tr.dataset.ta,t=(plTag(ED.c,a)||'').toLowerCase();tr.hidden=!!q&&!(a.toLowerCase().includes(q)||t.includes(q))})}
function plCfgBar(){const c=ED.c,sl=(k,o,l)=>`<label>${l}<select data-cfg=${k}>${o.map(v=>`<option ${c.p[k]==v?'selected':''}>${v}</option>`).join('')}</select></label>`,cf=plCfg(c);
 $p('plCf').innerHTML=`<div class=tgh><b>Device configuration</b><span class=mu>Choose how many channels this PLC has. Wires on removed terminals are deleted.</span></div>
  <div class=cfg>${sl('preset',PPRE.map(q=>q[0]).concat(c.p.preset==='Custom'?['Custom']:[]),'CPU preset')}${sl('mode',['RUN','STOP'],'Operating mode')}
  <fieldset><legend>Digital</legend>${sl('nDI',NOPT(PMAX.DI),'Inputs (DI)')}${sl('nDO',NOPT(PMAX.DO),'Outputs (DO)')}</fieldset>
  <fieldset><legend>Analog</legend>${sl('nAI',NOPT(PMAX.AI),'Inputs (AI)')}${sl('aiT',['0-10 V','4-20 mA'],'AI type')}${sl('nAO',NOPT(PMAX.AO),'Outputs (AO)')}${sl('aoT',['0-10 V','4-20 mA'],'AO type')}</fieldset></div>
  <p class=mu style="padding:0 12px">Now fitted: <b>${cf.DI}</b> DI · <b>${cf.DO}</b> DO · <b>${cf.AI}</b> AI · <b>${cf.AO}</b> AO.</p>`}
const plSel=(k,o,cur,txt)=>`<select data-pf=${k}>${o.map(v=>`<option value="${esc(v)}" ${v==cur?'selected':''}>${txt?txt(v):esc(v)}</option>`).join('')}</select>`;
function plProps(){const s=ED.sel,el=$p('plPr'),A=plAdrs(ED.c);let h;
 if(!s)h=`New elements go into <b>network ${ED.ri+1}</b>. Drag an instruction from the <b>Instructions</b> pane onto the network, or click it to add it after the selected element. <span class=mu>Keys: <kbd>C</kbd> NO · <kbd>N</kbd> NC · <kbd>A</kbd> compare · <kbd>B</kbd> branch · <kbd>O</kbd> OUT · <kbd>S</kbd> SET · <kbd>R</kbd> RST · <kbd>T</kbd> TON · <kbd>U</kbd> CTU · <kbd>M</kbd> MOVE · <kbd>Del</kbd> delete · <kbd>Ctrl+Z</kbd> undo · <kbd>Ctrl+D</kbd> duplicate network</span>`;
 else{h=`<b>${KN[s.k]}</b>`;
  if(isCon(s))h+=`<label>Type<select data-pf=k><option value=no ${s.k==='no'?'selected':''}>NO  ┤ ├</option><option value=nc ${s.k==='nc'?'selected':''}>NC  ┤/├</option></select></label>`;
  if(s.a)h+=`<label>${s.k==='ao'?'Output':'Address'}<select data-pf=a>${adrOpts(s.k,s.a)}</select></label>`;
  if(s.k==='cmp')h+=`<label>Is<select data-pf=op>${OPS.map(o=>`<option ${o===s.op?'selected':''}>${esc(o)}</option>`).join('')}</select></label><label>Value<input type=number step=any data-pf=v value=${+s.v}></label><span class=mu>% for analog, s for timers, counts for counters</span>`;
  if(s.k==='ao')h+=`<label>Value from<select data-pf=src><option value=const ${s.src==='const'||!s.src?'selected':''}>constant</option>${A.AI.map(a=>`<option value="${a}" ${s.src===a?'selected':''}>${a}${tagOf(a)?' – '+esc(tagOf(a)):''}</option>`).join('')}</select></label>${s.src&&s.src!=='const'?'':`<label>Value (%)<input type=number min=0 max=100 step=1 data-pf=v value=${+s.v}></label>`}`;
  if(s.k==='ton')h+=`<label>Preset PT (s)<input type=number min=.1 step=.1 data-pf=v value=${s.v}></label>`;
  if(s.k==='ctu')h+=`<label>Preset PV (counts)<input type=number min=1 step=1 data-pf=v value=${s.v}></label>`;
  if(s.a)h+=`<label>Name<input type=text maxlength=24 data-pf=tag placeholder="tag for ${s.a}" value="${esc(plTag(ED.c,s.a))}"></label>`;
  if(s.k==='p')h+=` – <i>Branch adds another parallel row; contacts are added after the branch.</i>`}
 el.innerHTML=`<span class=pph>Properties</span>${h}`}
function plChanged(){plPush();plView();S.dirty=1;commit()}

/* ---- adding, placing, moving ---- */
function plNew(k,cop){const n={k,a:''},used=new Set();ED.c.prog.rungs.forEach(q=>q.o.forEach(o=>used.add(o.a)));n.a=plDef(k,used);
 if(k==='ton')n.v=3;if(k==='ctu')n.v=5;if(k==='cmp'){n.op=cop||'>';n.v=50}if(k==='ao'){n.src='const';n.v=50}return n}
function plBranchAt(r,s,n){if(s.k==='p'){s.ch.push({k:'s',ch:[n]});return}
 const f=plFind(r,s);if(!f)return;const[arr,i,row]=f,g=row!==r.c&&plFind(r,row);
 if(g&&g[2]&&g[2].k==='p'&&row.ch.length===1)g[2].ch.splice(g[1]+1,0,{k:'s',ch:[n]});
 else arr[i]={k:'p',ch:[{k:'s',ch:[s]},{k:'s',ch:[n]}]}}
function plPlace(ri,sl,n){const r=ED.c.prog.rungs[ri];
 if(sl.t==='oe')r.o.push(n);
 else if(sl.t==='ob'||sl.t==='oa'){const i=r.o.indexOf(sl.ref);r.o.splice(i<0?r.o.length:i+(sl.t==='oa'?1:0),0,n)}
 else if(sl.t==='end')r.c.ch.push(n);
 else if(sl.t==='br')plBranchAt(r,sl.ref,n);
 else{const f=plFind(r,sl.ref);if(!f)r.c.ch.push(n);else f[0].splice(f[1]+(sl.t==='a'?1:0),0,n)}}
function plMove(node,sl){const R=ED.c.prog.rungs;if(sl.ref===node)return false;let s=null;
 for(let i=0;i<R.length&&!s;i++){const f=plFind(R[i],node);if(f)s=[i,f]}
 if(!s)return false;s[1][0].splice(s[1][1],1);plNorm(R[s[0]].c.ch);plPlace(sl.ri,sl,node);return true}
function plAdd(k,cop){const r=plR(),n=plNew(k,cop),f=ED.sel&&plFind(r,ED.sel);
 if(k==='ao'&&!plAdrs(ED.c).AO.length){toast('This PLC has no analog outputs – set AO in Device configuration');return}
 if(isOut(n))r.o.push(n);else if(f&&f[2])f[0].splice(f[1]+1,0,n);else r.c.ch.push(n);
 ED.sel=n;plChanged()}
function plBranch(){const r=plR(),s=ED.sel;if(!s||isOut(s)){toast('Select a contact first, then press Branch');return}
 const oc=r.o.find(o=>o.k==='out'),n={k:'no',a:oc?oc.a:plDef('no',new Set())};plBranchAt(r,s,n);ED.sel=n;plChanged()}
function plDel(){const r=plR(),s=ED.sel,f=s&&plFind(r,s);if(!f)return;f[0].splice(f[1],1);plNorm(r.c.ch);ED.sel=null;plChanged()}
function plRung(a,ri){const R=ED.c.prog.rungs;
 if(a==='add'){R.splice(ED.ri+1,0,newRung());ED.ri++}
 else if(a==='ins'){R.splice(ri+1,0,newRung());ED.ri=ri+1}
 else if(a==='dup'){R.splice(ri+1,0,JSON.parse(JSON.stringify(R[ri])));ED.ri=ri+1}
 else if(a==='del'){if(R.length===1)R[0]=newRung();else{R.splice(ri,1);ED.ri=Math.min(ED.ri,R.length-1)}}
 else{const j=ri+(a==='up'?-1:1);if(j<0||j>=R.length)return;[R[ri],R[j]]=[R[j],R[ri]];ED.ri=j}
 ED.sel=null;plChanged()}

/* ---- drag and drop (mouse, pen and touch) ---- */
function plNearSlot(x,y,cls){let best=null,bd=44,ba=1e9;
 plDlg.querySelectorAll('.sl.'+cls).forEach(el=>{const r=el.getBoundingClientRect();if(!r.width)return;
  const dx=Math.max(r.left-x,0,x-r.right),dy=Math.max(r.top-y,0,y-r.bottom),d=Math.hypot(dx,dy),a=r.width*r.height;
  if(d<bd-.5||(Math.abs(d-bd)<=.5&&a<ba)){best=el;bd=d;ba=a}});return best}
function plDragStart(e){if(e.button>0||!ED||ED.view!=='main')return;
 const pi=e.target.closest('.pi[data-add]');let node=null;
 if(!pi&&e.pointerType!=='touch'){const h=e.target.closest('.rs [data-i]');if(h){const n=ED.nodes[+h.dataset.i];if(n&&n.k!=='s'&&n.k!=='p')node=n}}
 if(pi||node)DG={x:e.clientX,y:e.clientY,pi,node,on:0}}
function plDragMove(e){if(!DG)return;
 if(!DG.on){if(Math.hypot(e.clientX-DG.x,e.clientY-DG.y)<6)return;DG.on=1;
  DG.k=DG.pi?DG.pi.dataset.add:DG.node.k;DG.cls=isOut({k:DG.k})?'o':'c';plDlg.classList.add('dg','dg-'+DG.cls);
  const g=document.createElement('div');g.className='dgh';g.textContent=DG.pi?(DG.pi.querySelector('.sy')||DG.pi).textContent+' '+DG.k.toUpperCase():(DG.node.a||DG.k)+'';plDlg.appendChild(g);DG.g=g}
 e.preventDefault();DG.g.style.left=e.clientX+12+'px';DG.g.style.top=e.clientY+10+'px';
 const hot=plNearSlot(e.clientX,e.clientY,DG.cls);if(hot!==DG.hot){DG.hot&&DG.hot.classList.remove('hot');DG.hot=hot;hot&&hot.classList.add('hot')}
 const b=$p('plBody').getBoundingClientRect();if(e.clientY<b.top+36)$p('plBody').scrollTop-=14;else if(e.clientY>b.bottom-36)$p('plBody').scrollTop+=14}
function plDragEnd(e){if(!DG)return;const d=DG;DG=null;if(!d.on)return;
 plSwallow=performance.now();d.g.remove();plDlg.classList.remove('dg','dg-c','dg-o');
 if(e.type==='pointercancel'||!d.hot||!ED)return;const sl=ED.slots[+d.hot.dataset.sl];if(!sl)return;
 if(d.pi){if(d.k==='ao'&&!plAdrs(ED.c).AO.length){toast('This PLC has no analog outputs – set AO in Device configuration');return}
  const n=plNew(d.k,d.pi.dataset.cop);plPlace(sl.ri,sl,n);ED.ri=sl.ri;ED.sel=n;plChanged()}
 else if(plMove(d.node,sl)){ED.ri=sl.ri;ED.sel=d.node;plChanged()}}

/* ---- window ---- */
function plIO(){const c=ED.c,cf=plCfg(c),ch=(a,cl,x)=>`<${x?'button':'span'} class="ioc ${cl}" ${x?'data-fi':'data-fo'}=${a} title="${esc(plTag(c,a)||a)}">${a}${plTag(c,a)?`<i>${esc(plTag(c,a))}</i>`:''}</${x?'button':'span'}>`;let h='';
 if(cf.DI)h+='<span class=iot>Inputs <small>(click to force)</small></span>'+Array.from({length:cf.DI},(_,i)=>ch(aDI(i),'',1)).join('');
 if(cf.AI)h+='<span class=iot>Analog in <small>(drag to force)</small></span>'+Array.from({length:cf.AI},(_,i)=>{const a='AI'+i;return`<span class=aic data-ai=${a}><b>${a}</b>${plTag(c,a)?`<i>${esc(plTag(c,a))}</i>`:''}<input type=range min=0 max=100 step=1 value=0 data-fa=${a}><span data-av=${a}>0 %</span><button class=ioc data-fr=${a} title="Release the forced value" hidden>auto</button></span>`}).join('');
 if(cf.DO)h+='<span class=iot>Outputs</span>'+Array.from({length:cf.DO},(_,i)=>ch(aDO(i),'q',0)).join('');
 if(cf.AO)h+='<span class=iot>Analog out</span>'+Array.from({length:cf.AO},(_,i)=>`<span class="ioc q" data-ao=AO${i}>AO${i} <b>0 %</b></span>`).join('');
 $p('plIO').innerHTML=h||'<span class=iot>No I/O fitted – choose the channel counts in Device configuration.</span>'}

function plcOpen(c){
 if(!c.prog||!Array.isArray(c.prog.rungs)||!c.prog.rungs.length)c.prog={rungs:[newRung()]};
 if(!c.tags)c.tags={};
 ED={c,ri:0,sel:null,nodes:[],slots:[],view:'main',hs:[],hi:-1};plPush();
 if(!plDlg){plDlg=document.createElement('dialog');plDlg.id='dPLC';document.body.appendChild(plDlg);
  const pal=PLPAL.map(([g,it,sm])=>`<details open><summary>${g}</summary><div class="gb${sm?' sm':''}">${it.map(([k,sy,nm,key,cop])=>`<button class=pi data-add=${k}${cop?` data-cop="${esc(cop)}"`:''} title="${nm}${key?' ('+key+')':''} – drag onto a network or click"><span class=sy>${sy}</span><span class=nm>${nm}</span></button>`).join('')}</div></details>`).join('');
  plDlg.innerHTML=`<div class=ph><b id=plT></b><span class=sp></span><span id=plSt></span><button data-op=run title="Run simulation">▶ Run</button><button data-op=stop title="Stop">■ Stop</button><button data-op=close class=pri>Close</button></div>
   <div class=ptb><button data-ed data-op=rung title="Add a network after the current one (+)">＋ Network</button><button data-ed data-op=br title="Wrap the selected contact in a parallel branch (B)">⎇ Branch</button><button data-ed data-op=del class=dn title="Delete the selected element (Del)">🗑 Delete</button><span class=vs></span>
    <button data-op=undo title="Undo (Ctrl+Z)">↶</button><button data-op=redo title="Redo (Ctrl+Y)">↷</button><span class=vs></span>
    <label class=zm>Zoom<select data-z><option value=.75>75 %</option><option value=1 selected>100 %</option><option value=1.25>125 %</option><option value=1.5>150 %</option></select></label><span class=sp></span><button data-ed data-op=clr class=dn>Clear program</button></div>
   <div class=pmain>
    <nav class=ptree><div class=pt0>Project tree</div><div class=pt1>▾ ▣ <span id=plLbl></span></div>
     <button class=ti data-v=cfg>⚙ Device configuration</button><div class=pt2>▾ Program blocks</div><button class="ti on" data-v=main>▤ Main [OB1]</button><div class=pt2>▾ PLC tags</div><button class=ti data-v=tags>🏷 Tag table</button></nav>
    <section class=pctr><div id=plBody class=pbody></div><div id=plTags class=ptags hidden></div><div id=plCf class=pcfgv hidden></div><div id=plPr class=ppr></div>
     <details id=plIOw open class=pio-w><summary>Watch &amp; force table (I/O)</summary><div id=plIO class=pio></div></details></section>
    <aside class=pins><div class=pt0>Instructions</div><div class=phint>Drag onto a network, or click to add.</div>${pal}</aside>
   </div>`;
  plDlg.addEventListener('click',e=>{if(performance.now()-plSwallow<350){e.stopPropagation();e.preventDefault()}},true);
  plDlg.addEventListener('click',plClick);plDlg.addEventListener('change',plChange);
  plDlg.addEventListener('pointerdown',plDragStart);plDlg.addEventListener('pointermove',plDragMove);plDlg.addEventListener('pointerup',plDragEnd);plDlg.addEventListener('pointercancel',plDragEnd);
  plDlg.addEventListener('input',e=>{const t=e.target;if(!ED)return;
   if(t.dataset.rc!=null){ED.c.prog.rungs[+t.dataset.rc].cm=t.value;S.dirty=1}
   else if(t.dataset.rt!=null){ED.c.prog.rungs[+t.dataset.rt].t=t.value;S.dirty=1}
   else if(t.id==='plTf')plTagFilter();
   else if(t.dataset.fa){plPL().fr[t.dataset.fa]=+t.value;S.dirty=1}});
  plDlg.addEventListener('keydown',e=>{if(!ED||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key,lk=k.toLowerCase();
   if((e.ctrlKey||e.metaKey)&&lk==='z'){e.preventDefault();plUndo(e.shiftKey?1:-1);return}
   if((e.ctrlKey||e.metaKey)&&lk==='y'){e.preventDefault();plUndo(1);return}
   if(ED.view!=='main')return;
   if(k==='Delete'||k==='Backspace'){e.preventDefault();plDel();return}
   if((e.ctrlKey||e.metaKey)&&lk==='d'){e.preventDefault();plRung('dup',ED.ri);return}
   if(e.ctrlKey||e.metaKey||e.altKey)return;
   const m={c:'no',n:'nc',a:'cmp',o:'out',s:'set',r:'rst',t:'ton',u:'ctu',m:'ao'}[lk];
   if(m){e.preventDefault();plAdd(m)}else if(lk==='b'){e.preventDefault();plBranch()}else if(k==='+'||k==='='){e.preventDefault();plRung('add')}});
  plDlg.addEventListener('close',()=>{ED=null;DG=null;S.dirty=1;props()})}
 plDlg.classList.remove('dg','dg-c','dg-o');plDlg.querySelectorAll('.dgh').forEach(x=>x.remove());
 $p('plT').textContent='Ladder logic (LAD) – '+c.label;
 plIO();plView();if(!plDlg.open)plDlg.showModal()}

function plClick(e){const t=e.target,op=t.closest('[data-op]'),ad=t.closest('[data-add]'),rb=t.closest('[data-rb]'),fi=t.closest('[data-fi]'),fr=t.closest('[data-fr]'),vw=t.closest('[data-v]'),i=t.closest('[data-i]'),rg=t.closest('.rg');
 if(vw){ED.view=vw.dataset.v;plView();return}
 if(op){const o=op.dataset.op;if(o==='close')plDlg.close();else if(o==='run')document.getElementById('bRun').click();else if(o==='stop')document.getElementById('bStop').click();
  else if(o==='undo')plUndo(-1);else if(o==='redo')plUndo(1);
  else if(ED.view!=='main'&&/^(br|del|rung|clr)$/.test(o)){ED.view='main';plView();if(o==='rung')plRung('add')}
  else if(o==='br')plBranch();else if(o==='del')plDel();else if(o==='rung')plRung('add');
  else if(o==='clr'&&confirm('Delete the whole ladder program of this PLC?')){ED.c.prog={rungs:[newRung()]};ED.ri=0;ED.sel=null;plChanged()}return}
 if(ad){if(ED.view!=='main'){ED.view='main';plView()}plAdd(ad.dataset.add,ad.dataset.cop);return}
 if(rb){const a=rb.dataset.rb;if(a==='tog'){const r=ED.c.prog.rungs[+rb.dataset.r];r.col=r.col?0:1;plView();return}plRung(a,+rb.dataset.r);return}
 if(fi){const pl=plPL(),a=fi.dataset.fi;pl.fr[a]=!pl.fr[a];S.dirty=1;return}
 if(fr){delete plPL().fr[fr.dataset.fr];S.dirty=1;return}
 if(rg&&!t.closest('input,button')){ED.ri=+rg.dataset.r;const n=i&&ED.nodes[+i.dataset.i];ED.sel=n&&n.k!=='s'?n:null;
  document.querySelectorAll('#plBody .rg').forEach(q=>q.classList.toggle('cur',+q.dataset.r===ED.ri));plView()}}
function plChange(e){const t=e.target;if(!ED)return;
 if(t.dataset.z){plZm=+t.value||1;plView();return}
 if(t.dataset.rc!=null||t.dataset.rt!=null){plPush();return}
 if(t.dataset.cfg){const k=t.dataset.cfg,c=ED.c;c.p[k]=t.value;plcChg(c,k);plIO();plView();plPush();S.dirty=1;return}
 if(t.dataset.tg){const a=t.dataset.tg,v=t.value.trim();if(!ED.c.tags)ED.c.tags={};if(v)ED.c.tags[a]=v;else delete ED.c.tags[a];plPush();plIO();S.dirty=1;commit();return}
 const k=t.dataset.pf,s=ED.sel;if(!k||!s)return;
 if(k==='tag'){const v=t.value.trim();if(!ED.c.tags)ED.c.tags={};if(v)ED.c.tags[s.a]=v;else delete ED.c.tags[s.a];plIO();plChanged();return}
 if(k==='v'){const v=parseFloat(t.value);if(Number.isNaN(v))return plProps();
  if(s.k==='ctu')s.v=Math.max(1,Math.round(v));else if(s.k==='ton'){if(!(v>0))return plProps();s.v=v}else if(s.k==='ao')s.v=Math.max(0,Math.min(100,v));else s.v=v}
 else s[k]=t.value;plChanged()}

/* live view: power flow, I/O strip, timer / counter / analog values (called every frame from app.js) */
function plcLive(t){if(!ED||!plDlg||!plDlg.open||t-plLast<90)return;plLast=t;
 const c=ED.c,s=c.s,pl=s.pl,b=(pl&&pl.b)||{},v=(pl&&pl.v)||{},an=(pl&&pl.an)||{},fr=(pl&&pl.fr)||{},cf=plCfg(c),live=S.run&&s.pw&&c.p.mode==='RUN';
 plDlg.querySelectorAll('[data-s]').forEach(el=>{const n=ED.nodes[+el.dataset.i],p=n&&PW.get(n);el.classList.toggle('on',!!(live&&p&&p[el.dataset.s]))});
 plDlg.querySelectorAll('[data-tv]').forEach(el=>{const[a,cfg,k]=el.dataset.tv.split('|'),x=live?v[a]||0:0;
  el.textContent=k==='ton'?x.toFixed(1)+' / '+cfg.split(' / ')[1]:k==='ctu'?Math.round(x)+' / '+cfg.split(' / ')[1]:live?(an[a]||0).toFixed(0)+' %  ('+plEng(cf,'ao',an[a]||0)+')':cfg});
 plDlg.querySelectorAll('[data-fi],[data-fo]').forEach(el=>{const a=el.dataset.fi||el.dataset.fo;el.classList.toggle('on',!!b[a]);el.classList.toggle('frc',!!(pl&&pl.fr[a]))});
 plDlg.querySelectorAll('[data-ai]').forEach(box=>{const a=box.dataset.ai,forced=typeof fr[a]==='number',sl=box.querySelector('input'),val=live||forced?(an[a]||0):0;
  if(document.activeElement!==sl)sl.value=forced?fr[a]:Math.round(val);
  box.querySelector('[data-av]').textContent=Math.round(val)+' %  '+plEng(cf,'ai',val);box.classList.toggle('frc',forced);box.querySelector('[data-fr]').hidden=!forced});
 plDlg.querySelectorAll('[data-ao]').forEach(el=>{const a=el.dataset.ao,val=live?an[a]||0:0;el.querySelector('b').textContent=Math.round(val)+' %  '+plEng(cf,'ao',val);el.classList.toggle('on',val>0)});
 $p('plSt').textContent=!S.run?'Simulation stopped':!s.pw?'PLC has no power':c.p.mode!=='RUN'?'PLC in STOP mode':'RUN'}
