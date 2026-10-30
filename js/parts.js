/* =====================================================================
   ElectroSim – symbol library (IEC 60617 / EPLAN-style drawing symbols)
   ---------------------------------------------------------------------
   Orientation : vertical (terminals top / bottom on a 20 px grid), R rotates.
   Fields      : n name · cat category · pre tag prefix (IEC 81346) · t terminals [x,y,'pin']
                 p params {key:[default,unit,label,options]} · el solver elements · cl closed?
                 g(c,o,cl) → SVG symbol · sub(c) rating text · pn(c,i) pin text override
   Coils and their contacts are separate parts (like a real EPLAN diagram):
   a contact is linked to a coil by its tag (property "Controlled by").
   ===================================================================== */
const SVGCSS=`
:root{--ink:#17222e;--paper:#fff;--mut:#6a7a8b;--sig:#12a36b;--hot:#e8590c;--er:#d93a3a;--sel:#1a73e8}
.s{fill:none;stroke:var(--ink);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.s.d{stroke-dasharray:4 3}.s.er{stroke:var(--er)}.s.act{stroke:var(--sig);stroke-width:2.2}
.w{fill:var(--paper)}.f{fill:var(--ink);stroke:var(--ink);stroke-width:1.2}.on{fill:rgba(18,163,107,.3)}
.tx{fill:var(--ink);font:600 10px Arial,Helvetica,sans-serif;text-anchor:middle}
.mt{fill:var(--mut);font:8px Arial,Helvetica,sans-serif;text-anchor:middle}
.pn{fill:#3f5368;font:7.5px Arial,Helvetica,sans-serif;text-anchor:middle}
.tag{fill:var(--ink);font:700 11px Arial,Helvetica,sans-serif}
.sub{fill:var(--mut);font:9px Arial,Helvetica,sans-serif}
.tdot{fill:var(--paper);stroke:var(--ink);stroke-width:1.2;pointer-events:none}
.term{fill:transparent;cursor:crosshair}.term:hover+.tdot{fill:var(--hot);stroke:var(--hot)}
.selr{fill:rgba(26,115,232,.06);stroke:var(--sel);stroke-dasharray:4 3}
.wire{fill:none;stroke:var(--ink);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.wire.v{stroke:var(--hot);opacity:.6}.wire.hot{stroke:var(--hot);stroke-width:2}.wire.sel{stroke:var(--sel);stroke-width:2.2}
.fl{stroke-dasharray:3 9;animation:fl .45s linear infinite;stroke:#fff;stroke-width:1.3;fill:none;pointer-events:none}@keyframes fl{to{stroke-dashoffset:-12}}
.hit{fill:none;stroke:transparent;stroke-width:12;cursor:pointer}
.sh-bg{fill:var(--paper);stroke:#9fb0c2;stroke-width:1}.sh-fr{fill:none;stroke:var(--ink);stroke-width:1.6}
.sh-ln{stroke:var(--ink);stroke-width:.9;fill:none}.sh-zn{fill:#44566a;font:9px Arial,sans-serif;text-anchor:middle}
.sh-lb{fill:#44566a;font:8px Arial,sans-serif}.sh-v{fill:var(--ink);font:600 12px Arial,sans-serif}.sh-big{fill:var(--ink);font:800 18px Arial,sans-serif}
`;
if(typeof document!=='undefined')document.head.insertAdjacentHTML('beforeend','<style id="symcss">'+SVGCSS+'</style>');

const D={};
const P=(d,k='')=>`<path d="${d}" class="s ${k}"/>`;
const TXT=(x,y,t,k='mt')=>`<text x="${x}" y="${y}" class="${k}">${t}</text>`;
const two=[[0,-40,'1'],[0,40,'2']];
const reg=(k,o)=>(D[k]={p:{},t:two,...o});
const G2=(b,k,n,o={})=>(D[k]={...D[b],n,...o});
const R=(c,r)=>({k:'R',a:0,b:1,r});
const SW=c=>[R(c,D[c.type].cl(c)?.005:1e9)];
const gl=(c,o)=>o?Math.min(1.3,o.p/c.p.P):0;
const refComp=c=>typeof S==='undefined'?null:S.comps.find(x=>x.label===c.p.ref&&D[x.type].coil);
const refOn=c=>{const k=refComp(c);return k?(D[k.type].tm?!!k.s.done:!!k.s.en):false};
const CLR={green:'61,220,151',red:'255,70,70',amber:'255,180,0'},CTX={green:'GN',red:'RD',amber:'YE'};

/* ---------- building blocks ---------- */
/* operators (mechanical actuation drawn left of the contact blade) */
const OP={
 m:()=>P('M-4 0H-14','d')+P('M-14 -6V6')+P('M-14 -6H-20'),                 /* manual, general   */
 p:()=>P('M-4 0H-15','d')+P('M-15 -6V6'),                                    /* push button       */
 e:()=>P('M-4 0H-14','d')+`<path d="M-14 -9A10 9 0 0 0 -14 9Z" class="s" style="fill:#e23b3b"/>`, /* mushroom E-stop */
 s:()=>OP.m()+P('M-9 -3L-12 0L-9 3'),                                        /* selector (latching)*/
 k:()=>P('M-4 0H-13','d')+`<circle cx="-17" r="4" class="s w"/>`+P('M-21 0H-26M-24 0V3'),/* key */
 r:()=>P('M-4 0H-14','d')+`<circle cx="-17" r="3" class="s w"/>`+P('M-20 -5V5'),      /* roller / limit */
 l:(t)=>P('M-4 0H-14','d')+P('M-14 0L-21 -7L-28 0L-21 7Z','w')+(t?TXT(-21,2.4,t,'mt'):'')  /* proximity */
};
/* one contact (vertical, leads run to ±40). nc = break contact, cl = currently conducting */
function contact(cl,nc,op,t){
 const tx=nc?(cl?-8:10):-8,ty=nc?(cl?-10:-8):-10;
 return P(`M0 -40V-10${nc?'H-8':''}`)+P('M0 40V10')+P(`M0 10L${tx} ${ty}`,cl?'act':'')+(cl&&!nc?P('M-8 -10H0','act'):'')+(op?OP[op](t):'');
}
const delayArc=c=>{const k=refComp(c);return k&&D[k.type].tm?P('M-6 -6A5.5 5.5 0 0 0 -6 6'):''};
const pole=(cl,x)=>`<g transform="translate(${x} 0)">${contact(cl,false)}${P('M0 14A4 4 0 0 0 0 22')}</g>`;
/* coil box with A1/A2 leads */
function coilG(c,x=0){
 const tm=D[c.type].tm,hg=tm?P('M-5 -10H5L-5 3H5Z')+TXT(0,14,tm=='on'?'ON':'OFF','mt'):'';
 return `<g transform="translate(${x} 0)">${P('M0 -40V-18M0 18V40')}<rect x="-12" y="-18" width="24" height="36" class="s ${c.s.en?'on':''}"/>${hg}</g>`;
}
const brkBox=(c,h)=>`<rect x="-28" y="${-h/2}" width="14" height="${h}" class="s ${c.s.tripped?'er':''}"/>`+P(`M-25 ${h/2-4}V${-h/2+4}H-17`);
const brkG=(c,cl,h,lbl)=>contact(cl,false)+P('M-4 -24L4 -16M4 -24L-4 -16')+P('M-4 0H-14','d')+brkBox(c,h)+(lbl?TXT(-21,4,lbl,'mt'):'');
const fuseG=(c,tag)=>{const b=!!c.s.blown;return P('M0 -40V-15M0 15V40')+`<rect x="-6" y="-15" width="12" height="30" class="s w ${b?'er':''}"/>`+(b?P('M0 -15V-5M0 5V15','er'):P('M0 -15V15'))+(tag=='aM'?'<rect x="-6" y="0" width="12" height="15" class="f"/>':'')+(tag=='aR'?P('M-6 -15L6 15'):'')+(tag=='NH'?P('M-10 -15H10M-10 15H10'):'')};
const motG=(k)=>c=>P('M0 -40V-18M0 18V40')+`<circle r="18" class="s w"/>`+TXT(0,-1,'M','tx')+TXT(0,10,k,'mt')+`<g transform="rotate(${c.s.ang||0})"><circle cy="-13" r="2" class="f"/></g>`;
const meter=(l)=>(c,o)=>P('M0 -40V-17M0 17V40')+`<circle r="17" class="s w"/>`+TXT(0,-1,l,'tx')+(o?TXT(0,10,f(Math.abs(l=='V'?o.v:o.i)),'mt'):'');
const rect1=(extra='',fill='')=>P('M0 -40V-15M0 15V40')+`<rect x="-6" y="-15" width="12" height="30" class="s w" style="${fill}"/>`+extra;
const diodeG=(on,extra='')=>P('M0 -40V-10M0 10V40')+`<path d="M-10 -10H10L0 10Z" class="s" style="fill:${on}"/>`+P('M-10 10H10')+extra;

/* ================= POWER & REFERENCE ================= */
reg('dc',{n:'DC voltage source',cat:'Power & reference',pre:'G',src:1,t:[[0,-40,'+'],[0,40,'−']],p:{V:[24,'V','Voltage'],Imax:[50,'A','Max current']},el:c=>[{k:'V',a:0,b:1,v:c.p.V}],sub:c=>c.p.V+' V DC',
 g:()=>P('M0 -40V-16M0 16V40')+'<circle r="16" class="s w"/>'+P('M-8 -3H8')+P('M-8 4H8','d')});
reg('ac',{n:'AC voltage source',cat:'Power & reference',pre:'G',src:1,t:[[0,-40,'L'],[0,40,'N']],p:{V:[230,'V','RMS voltage'],Imax:[50,'A','Max current']},el:c=>[{k:'V',a:0,b:1,v:c.p.V}],sub:c=>c.p.V+' V AC',
 g:()=>P('M0 -40V-16M0 16V40')+'<circle r="16" class="s w"/>'+P('M-9 0q4.5-9 9 0t9 0')});
G2('dc','bat','Battery',{g:()=>P('M0 -40V-7M0 4V40')+P('M-13 -7H13')+P('M-7 4H7')});
G2('dc','psu','Power supply (SMPS 24 V DC)',{p:{V:[24,'V','Output voltage'],Imax:[10,'A','Max current']},
 g:()=>P('M0 -40V-22M0 22V40')+'<rect x="-22" y="-22" width="44" height="44" class="s w"/>'+P('M-22 22L22 -22')+P('M-16 -10q3-6 6 0t6 0')+P('M2 10H14')+P('M2 15H14','d')});
reg('gnd',{n:'Protective earth (PE)',cat:'Power & reference',pre:'PE',gnd:1,t:[[0,-20,'PE']],el:()=>[{k:'R',a:0,b:0,r:1e9}],
 g:()=>P('M0 -20V0')+P('M-12 0H12')+P('M-8 6H8')+P('M-4 12H4')});

/* ================= PROTECTION ================= */
reg('fus',{n:'Cartridge fuse',cat:'Protection',pre:'FA',fuse:1,p:{I:[2,'A','Rating']},cl:c=>!c.s.blown,el:SW,sub:c=>c.p.I+' A',g:c=>fuseG(c)});
[['fgG','HRC fuse gG (general)',16,'gG'],['faM','Motor fuse aM',16,'aM'],['faR','Semiconductor fuse aR',16,'aR'],['fNH','NH blade fuse',100,'NH'],['fT','Time-delay fuse (T)',2,'T']].forEach(([k,n,i,l])=>G2('fus',k,n,{p:{I:[i,'A','Rating']},tol:l=='T'?1.5:1,sub:c=>c.p.I+' A '+l,g:c=>fuseG(c,l)}));
reg('fsw',{n:'Fuse switch-disconnector',cat:'Protection',pre:'QS',fuse:1,tog:1,p:{I:[32,'A','Fuse rating']},cl:c=>c.s.on&&!c.s.blown,el:SW,sub:c=>c.p.I+' A',
 g:(c,o,cl)=>contact(cl,false)+P(`M${cl?-5:-13} -10H${cl?5:-3}`)+`<rect x="-5" y="-36" width="10" height="18" class="s w ${c.s.blown?'er':''}"/>`+P('M0 -36V-18')});
reg('mcb',{n:'Miniature circuit breaker (MCB)',cat:'Protection',pre:'QF',trip:1,tog:1,on0:1,p:{I:[16,'A','Trip current'],cv:['C','','Curve',['B','C','D']]},cl:c=>c.s.on&&!c.s.tripped,el:SW,sub:c=>(c.p.cv||'')+c.p.I+' A',g:(c,o,cl)=>brkG(c,cl,22)});
reg('mccb',{n:'Moulded-case breaker (MCCB)',cat:'Protection',pre:'QF',trip:1,tog:1,on0:1,p:{I:[100,'A','Trip current']},cl:c=>c.s.on&&!c.s.tripped,el:SW,sub:c=>c.p.I+' A',g:(c,o,cl)=>brkG(c,cl,30,'I>')});
reg('mpcb',{n:'Motor protection breaker (MPCB)',cat:'Protection',pre:'QM',trip:1,tog:1,on0:1,p:{I:[10,'A','Trip setting']},cl:c=>c.s.on&&!c.s.tripped,el:SW,sub:c=>c.p.I+' A',g:(c,o,cl)=>brkG(c,cl,30,'M')});
reg('iso',{n:'Isolator switch',cat:'Protection',pre:'QS',tog:1,on0:1,cl:c=>c.s.on,el:SW,g:(c,o,cl)=>contact(cl,false,'m')+P(`M${cl?-5:-13} -10H${cl?5:-3}`)});
reg('ovl',{n:'Thermal overload relay',cat:'Protection',pre:'FR',trip:1,t:[[-20,-40,'1'],[-20,40,'2'],[20,-40,'95'],[20,40,'96']],p:{I:[6,'A','Trip setting']},sub:c=>c.p.I+' A',
 el:c=>[R(c,.01),{k:'R',a:2,b:3,r:c.s.tripped?1e9:.005}],
 g:c=>P('M-20 -40V-15M-20 15V40')+`<rect x="-27" y="-15" width="14" height="30" class="s w ${c.s.tripped?'er':''}"/>`+P('M-24 8L-24 -8H-16')+
  `<g transform="translate(20 0)">${contact(!c.s.tripped,true)}</g>`+P('M-13 0H16','d')});

/* ================= CONTROL DEVICES ================= */
reg('sw',{n:'Toggle switch (SPST)',cat:'Control devices',pre:'SA',tog:1,cl:c=>c.s.on,el:SW,g:(c,o,cl)=>contact(cl,false,'m')});
reg('sel',{n:'Selector switch (latching)',cat:'Control devices',pre:'SA',tog:1,cl:c=>c.s.on,el:SW,g:(c,o,cl)=>contact(cl,false,'s')});
reg('key',{n:'Key switch',cat:'Control devices',pre:'SA',tog:1,cl:c=>c.s.on,el:SW,g:(c,o,cl)=>contact(cl,false,'k')});
reg('pb',{n:'Push button (NO)',cat:'Control devices',pre:'SB',cl:c=>c.s.pressed,el:SW,g:(c,o,cl)=>contact(cl,false,'p')});
reg('pbnc',{n:'Push button (NC)',cat:'Control devices',pre:'SB',cl:c=>!c.s.pressed,el:SW,g:(c,o,cl)=>contact(cl,true,'p')});
reg('estop',{n:'Emergency stop (NC)',cat:'Control devices',pre:'SE',tog:1,cl:c=>!c.s.on,el:SW,g:(c,o,cl)=>contact(cl,true,'e')});
reg('spdt',{n:'Changeover switch (SPDT)',cat:'Control devices',pre:'SA',tog:1,t:[[0,40,'11'],[20,-40,'14'],[-20,-40,'12']],cl:c=>c.s.on,
 el:c=>[{k:'R',a:0,b:1,r:c.s.on?.005:1e9},{k:'R',a:0,b:2,r:c.s.on?1e9:.005}],
 g:c=>P('M0 40V10')+P('M-20 -40V-10')+P('M20 -40V-10')+P(`M0 10L${c.s.on?'20':'-20'} -10`,'act')+P('M-3 0H-12','d')+P('M-12 -6V6M-12 -6H-18')});

/* ================= COILS & CONTACTS ================= */
reg('kc',{n:'Contactor / relay coil',cat:'Coils & contacts',pre:'KM',coil:1,t:[[0,-40,'A1'],[0,40,'A2']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},el:c=>[R(c,c.p.Rc)],sub:c=>c.p.V+' V',g:c=>coilG(c)});
reg('tcon',{n:'Timer coil (ON-delay)',cat:'Coils & contacts',pre:'KT',coil:1,tm:'on',t:[[0,-40,'A1'],[0,40,'A2']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance'],T:[3,'s','Delay time']},el:c=>[R(c,c.p.Rc)],sub:c=>'T = '+c.p.T+' s',g:c=>coilG(c)});
G2('tcon','tcoff','Timer coil (OFF-delay)',{tm:'off'});
reg('cno',{n:'Contact NO (coil-operated)',cat:'Coils & contacts',pre:'',nolbl:1,t:[[0,-40,'13'],[0,40,'14']],p:{ref:['','','Controlled by (coil tag)','coil']},cl:refOn,el:SW,g:(c,o,cl)=>contact(cl,false)+delayArc(c)});
reg('cnc',{n:'Contact NC (coil-operated)',cat:'Coils & contacts',pre:'',nolbl:1,t:[[0,-40,'21'],[0,40,'22']],p:{ref:['','','Controlled by (coil tag)','coil']},cl:c=>!refOn(c),el:SW,g:(c,o,cl)=>contact(cl,true)+delayArc(c)});
reg('p3',{n:'Main contacts 3-pole (NO)',cat:'Coils & contacts',pre:'',nolbl:1,t:[[-20,-40,'1'],[-20,40,'2'],[0,-40,'3'],[0,40,'4'],[20,-40,'5'],[20,40,'6']],p:{ref:['','','Controlled by (coil tag)','coil']},cl:refOn,
 el:c=>{const s=D.p3.cl(c)?.005:1e9;return[[0,1],[2,3],[4,5]].map(([a,b])=>({k:'R',a,b,r:s}))},
 g:(c,o,cl)=>[-20,0,20].map(x=>pole(cl,x)).join('')+P('M-24 0H16','d')});
reg('rel',{n:'Relay (coil + contact)',cat:'Coils & contacts',pre:'KA',coil:1,t:[[40,-40,'A1'],[40,40,'A2'],[-20,-40,'13'],[-20,40,'14']],p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],ct:['NO','','Contact type',['NO','NC']]},
 pn:(c,i)=>i>1?(c.p.ct=='NC'?['21','22']:['13','14'])[i-2]:null,cl:c=>!!c.s.en==(c.p.ct==='NO'),el:c=>[R(c,c.p.Rc),{k:'R',a:2,b:3,r:D.rel.cl(c)?.005:1e9}],sub:c=>c.p.V+' V',
 g:(c,o,cl)=>`<g transform="translate(-20 0)">${contact(cl,c.p.ct==='NC')}</g>`+P('M-24 0H28','d')+coilG(c,40)});
reg('ton',{n:'Timer relay ON-delay (coil + contact)',cat:'Coils & contacts',pre:'KT',coil:1,tm:'on',t:D.rel.t,p:{V:[24,'V','Coil voltage'],Rc:[400,'Ω','Coil resistance'],T:[3,'s','Delay time']},sub:c=>'T = '+c.p.T+' s',
 cl:c=>!!c.s.done,el:c=>[R(c,c.p.Rc),{k:'R',a:2,b:3,r:D.ton.cl(c)?.005:1e9}],g:(c,o,cl)=>`<g transform="translate(-20 0)">${contact(cl,false)}${P('M-6 -6A5.5 5.5 0 0 0 -6 6')}</g>`+P('M-24 0H28','d')+coilG(c,40)});
G2('ton','tof','Timer relay OFF-delay (coil + contact)',{tm:'off'});
reg('con',{n:'Contactor 2-pole (coil + contacts)',cat:'Coils & contacts',pre:'KM',coil:1,t:[[50,-40,'A1'],[50,40,'A2'],[-10,-40,'1'],[-10,40,'2'],[10,-40,'3'],[10,40,'4']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},sub:c=>c.p.V+' V',
 cl:c=>!!c.s.en,el:c=>[R(c,c.p.Rc),{k:'R',a:2,b:3,r:c.s.en?.005:1e9},{k:'R',a:4,b:5,r:c.s.en?.005:1e9}],g:(c,o,cl)=>pole(cl,-10)+pole(cl,10)+P('M-14 0H38','d')+coilG(c,50)});
reg('con3',{n:'Contactor 3-pole (coil + contacts)',cat:'Coils & contacts',pre:'KM',coil:1,t:[[60,-40,'A1'],[60,40,'A2'],[-20,-40,'1'],[-20,40,'2'],[0,-40,'3'],[0,40,'4'],[20,-40,'5'],[20,40,'6']],p:{V:[24,'V','Coil voltage'],Rc:[600,'Ω','Coil resistance']},sub:c=>c.p.V+' V',
 cl:c=>!!c.s.en,el:c=>[R(c,c.p.Rc),...[[2,3],[4,5],[6,7]].map(([a,b])=>({k:'R',a,b,r:c.s.en?.005:1e9}))],g:(c,o,cl)=>[-20,0,20].map(x=>pole(cl,x)).join('')+P('M-24 0H48','d')+coilG(c,60)});

/* ================= SENSORS ================= */
reg('sens',{n:'Proximity sensor (generic)',cat:'Sensors',pre:'B',tog:1,cl:c=>c.s.on,el:SW,g:(c,o,cl)=>contact(cl,false,'l','')});
G2('sens','lim','Limit switch (roller)',{pre:'SQ',g:(c,o,cl)=>contact(cl,false,'r')});
[['sprox','Inductive proximity sensor','L'],['scap','Capacitive proximity sensor','C'],['spho','Photoelectric sensor','Ph'],['sprs','Pressure switch','p'],['stmp','Temperature switch','θ'],['slvl','Level / float switch','h'],['sflw','Flow switch','Q']]
 .forEach(([k,n,l])=>G2('sens',k,n,{g:(c,o,cl)=>contact(cl,false,'l',l)}));
reg('rtd',{n:'RTD sensor (Pt100)',cat:'Sensors',pre:'RT',p:{R0:[100,'Ω','R at 0 °C'],T:[25,'°C','Temperature']},el:c=>[R(c,Math.max(.1,c.p.R0*(1+.00385*c.p.T)))],sub:c=>'Pt100 '+c.p.T+' °C',g:()=>rect1(P('M-12 12L12 -12')+P('M12 -12H6'))});
G2('rtd','ntc','NTC thermistor',{p:{R25:[10000,'Ω','R at 25 °C'],B:[3950,'K','B value'],T:[25,'°C','Temperature']},el:c=>[R(c,c.p.R25*Math.exp(c.p.B*(1/(c.p.T+273.15)-1/298.15)))],sub:c=>'NTC '+c.p.T+' °C'});

/* ================= SIGNALLING ================= */
reg('lamp',{n:'Lamp',cat:'Signalling',pre:'EL',p:{V:[24,'V','Rated voltage'],P:[10,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>c.p.V+' V '+c.p.P+' W',
 g:(c,o)=>{const b=gl(c,o);return P('M0 -40V-12M0 12V40')+`<circle r="26" fill="#ffd23f" opacity="${b*.5}"/><circle r="12" class="s w" style="fill:rgba(255,210,63,${.05+b*.95})"/>`+P('M-8.5 -8.5L8.5 8.5M8.5 -8.5L-8.5 8.5')}});
reg('pl',{n:'Pilot lamp',cat:'Signalling',pre:'HL',p:{V:[24,'V','Rated voltage'],P:[2,'W','Rated power'],col:['green','','Colour',['green','red','amber']]},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>CTX[c.p.col]+' · '+c.p.V+' V',
 g:(c,o)=>{const b=gl(c,o),k=CLR[c.p.col];return P('M0 -40V-12M0 12V40')+`<circle r="26" fill="rgb(${k})" opacity="${b*.5}"/><circle r="12" class="s w" style="fill:rgba(${k},${.08+b*.9})"/>`+P('M-8.5 -8.5L8.5 8.5M8.5 -8.5L-8.5 8.5')}});
reg('buz',{n:'Buzzer / horn',cat:'Signalling',pre:'HA',p:{V:[24,'V','Rated voltage'],P:[3,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>c.p.V+' V',
 g:(c,o)=>P('M0 -40V-12M0 10V40')+'<path d="M-12 10V0A12 12 0 0 1 12 0V10Z" class="s w"/>'+(gl(c,o)>.3?P('M17 -8q6 6 0 12M22 -12q9 9 0 20','act'):'')});

/* ================= LOADS & MOTORS ================= */
reg('mot',{n:'AC motor (1~)',cat:'Loads & motors',pre:'M',spin:1,p:{V:[24,'V','Rated voltage'],P:[50,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>c.p.P+' W',g:motG('1~')});
G2('mot','motdc','DC motor',{g:motG('=')});G2('mot','fan','Fan / ventilator',{g:motG('F')});G2('mot','pump','Pump motor',{g:motG('P')});
reg('htr',{n:'Heater element',cat:'Loads & motors',pre:'EH',p:{V:[230,'V','Rated voltage'],P:[1000,'W','Rated power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>c.p.P+' W',
 g:(c,o)=>P('M0 -40V-15M0 15V40')+`<rect x="-9" y="-15" width="18" height="30" class="s w" style="fill:rgba(255,110,0,${gl(c,o)*.6})"/>`+P('M-5 -9L5 -4.5L-5 0L5 4.5L-5 9')});
reg('sol',{n:'Solenoid valve coil',cat:'Loads & motors',pre:'YV',p:{V:[24,'V','Coil voltage'],P:[8,'W','Coil power']},el:c=>[R(c,c.p.V*c.p.V/c.p.P)],sub:c=>c.p.V+' V',
 g:(c,o)=>P('M0 -40V-18M0 18V40')+`<rect x="-12" y="-18" width="24" height="36" class="s ${gl(c,o)>.5?'on':''}"/>`+P('M-12 18L12 -18')});

/* ================= PASSIVE ================= */
reg('res',{n:'Resistor',cat:'Passive',pre:'R',p:{R:[100,'Ω','Resistance'],P:[.5,'W','Power rating']},el:c=>[R(c,c.p.R)],sub:c=>c.p.R+' Ω',g:()=>rect1()});
reg('pot',{n:'Potentiometer',cat:'Passive',pre:'RP',t:[[0,-40,'1'],[0,40,'3'],[40,0,'2']],p:{R:[1000,'Ω','Total R'],pos:[.5,'','Wiper 0-1']},sub:c=>c.p.R+' Ω',
 el:c=>{const q=Math.min(1,c.p.pos),r=c.p.R;return[{k:'R',a:0,b:2,r:Math.max(r*q,.001)},{k:'R',a:2,b:1,r:Math.max(r*(1-q),.001)}]},g:()=>rect1(P('M40 0H8M8 0L14 -4M8 0L14 4'))});
reg('cap',{n:'Capacitor',cat:'Passive',pre:'C',dyn:'c',p:{C:[100,'µF','Capacitance']},sub:c=>c.p.C+' µF',el:c=>{const g=c.p.C*1e-6/DT;return[R(c,1/g),{k:'I',a:0,b:1,i:-g*(c.s.vc||0)}]},
 g:()=>P('M0 -40V-4M0 40V4')+P('M-13 -4H13')+P('M-13 4H13')});
G2('cap','capE','Capacitor (polarised)',{g:()=>P('M0 -40V-4M0 40V4')+P('M-13 -4H13')+P('M-13 7Q0 1 13 7')+TXT(-18,-6,'+','tx')});
reg('ind',{n:'Inductor (coil)',cat:'Passive',pre:'L',dyn:'l',p:{L:[100,'mH','Inductance']},sub:c=>c.p.L+' mH',el:c=>[R(c,c.p.L*1e-3/DT),{k:'I',a:0,b:1,i:c.s.il||0}],
 g:()=>P('M0 -40V-16')+P('M0 -16a4 4 0 0 1 0 8a4 4 0 0 1 0 8a4 4 0 0 1 0 8a4 4 0 0 1 0 8')+P('M0 16V40')});

/* ================= SEMICONDUCTORS ================= */
reg('dio',{n:'Diode',cat:'Semiconductors',pre:'V',dio:1,t:[[0,-40,'A'],[0,40,'K']],el:c=>[R(c,c.s.fw?.05:1e9)],g:c=>diodeG(c.s.fw?'var(--sig)':'var(--ink)')});
G2('dio','led','LED',{g:c=>diodeG(c.s.fw?'rgba(61,220,151,.9)':'#fff',P('M7 -6L15 -14M11 -14H15V-10')+P('M13 0L21 -8M17 -8H21V-4'))});
reg('brg',{n:'Bridge rectifier',cat:'Semiconductors',pre:'V',brg:1,t:[[-40,0,'AC1'],[40,0,'AC2'],[0,-40,'+'],[0,40,'−']],
 el:c=>[[0,2],[1,2],[3,0],[3,1]].map(([a,b],j)=>({k:'R',a,b,r:c.s['f'+j]?.05:1e9})),
 g:()=>P('M-40 0H-24M24 0H40M0 -40V-24M0 24V40')+P('M0 -24L24 0L0 24L-24 0Z','w')+
  [[-12,-12,-45],[12,-12,-135],[-12,12,-135],[12,12,-45]].map(([x,y,a])=>`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-4 -4V4L4 0Z" class="f"/><path d="M4 -4V4" class="s"/></g>`).join('')});

/* ================= MAGNETICS ================= */
reg('xf',{n:'Transformer',cat:'Magnetics',pre:'T',xf:1,t:[[-10,-40,'P1'],[-10,40,'P2'],[10,-40,'S1'],[10,40,'S2']],p:{Vp:[230,'V','Primary V'],Vs:[24,'V','Secondary V']},sub:c=>c.p.Vp+' / '+c.p.Vs+' V',
 el:c=>{const n=c.p.Vs/c.p.Vp;return[{k:'V',a:2,b:3,v:n*(c.vp||0)},{k:'R',a:0,b:1,r:c.p.Vp*c.p.Vp/5},{k:'I',a:0,b:1,i:n*(c.dl||0)}]},
 g:()=>P('M-10 -40V-16M-10 16V40M10 -40V-16M10 16V40')+'<circle cx="-10" r="16" class="s"/><circle cx="10" r="16" class="s"/>'+'<circle cx="-14" cy="-22" r="1.6" class="f"/><circle cx="6" cy="-22" r="1.6" class="f"/>'});
G2('xf','xf2','Isolating transformer 1:1',{p:{Vp:[230,'V','Primary V'],Vs:[230,'V','Secondary V']}});

/* ================= CONNECTION ================= */
reg('term',{n:'Terminal (X)',cat:'Connection',pre:'X',el:c=>[R(c,.001)],g:()=>P('M0 -40V40')+'<circle r="6" class="s w"/>'});
G2('term','plug','Plug / socket connector',{g:()=>P('M0 -40V-6')+P('M-7 -14L0 -6L7 -14')+P('M0 40V6')+P('M-7 14L0 6L7 14')});

/* ================= INSTRUMENTS ================= */
reg('vm',{n:'Voltmeter',cat:'Instruments',pre:'PV',el:c=>[R(c,1e7)],g:meter('V')});
reg('am',{n:'Ammeter',cat:'Instruments',pre:'PA',el:c=>[R(c,.001)],g:meter('A')});

/* ---- legacy aliases kept for saved circuits made with the first version ---- */
/* ---- symbol thumbnail for the library / landing page ---- */
function icon(t){
 const d=D[t],c={type:t,x:0,y:0,rot:0,p:{},s:{on:!!d.on0}};for(const k in d.p)c.p[k]=d.p[k][0];
 let h='';try{h=d.g(c,null,d.cl?d.cl(c):0)}catch(e){}
 const xs=d.t.map(q=>q[0]),ys=d.t.map(q=>q[1]),x0=Math.min(-32,Math.min(...xs)-8),x1=Math.max(32,Math.max(...xs)+8),y0=Math.min(-44,Math.min(...ys)-4),y1=Math.max(44,Math.max(...ys)+4);
 const dots=d.t.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" class="tdot"/>`).join('');
 return`<svg viewBox="${x0} ${y0} ${x1-x0} ${y1-y0}">${h.replace(/<text.*?<\/text>/g,'')}${dots}</svg>`;
}
