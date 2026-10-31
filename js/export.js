/* ElectroSim – PDF export (drawing sheets + styled parts list). Uses the bundled jsPDF in js/vendor. */
'use strict';
const SVGNS='http://www.w3.org/2000/svg';
const pdfTxt=s=>String(s==null?'':s).replace(/Ω/g,'ohm').replace(/[−–—]/g,'-').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/θ/g,'theta').replace(/⇒/g,'->').replace(/…/g,'...').replace(/[^\x20-\x7E\u00A0-\u00FF]/g,'?');
const natCmp=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});

/* inner markup (HTML-ish) -> well-formed standalone SVG string */
function buildSVG(inner,vb,wpx,hpx){const s=document.createElementNS(SVGNS,'svg');
 s.setAttribute('width',wpx);s.setAttribute('height',hpx);s.setAttribute('viewBox',vb.join(' '));s.setAttribute('class','exp');s.setAttribute('style',PAPERVARS);
 s.innerHTML=`<style>${SVGCSS}</style>`+inner;return new XMLSerializer().serializeToString(s)}
function rasterSVG(svg,w,h,type,bg){return new Promise((res,rej)=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'})),img=new Image();
 img.onload=()=>{const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);const x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,c.width,c.height)}x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL(type||'image/png',.95))};
 img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('Could not render the drawing for PDF'))};img.src=url})}
const loadImg=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=u});

async function sheetImage(pi){const[W,H]=paperPx(),k=Math.min(3,3600/W);
 return rasterSVG(buildSVG(sheetMarkup(pi,true)+pageMarkup(S.pages[pi].id,false),[0,0,W,H],W*k,H*k),W*k,H*k,'image/jpeg','#fff')}
const iconCache={};
async function iconImage(type){if(iconCache[type])return iconCache[type];const{vb,inner}=iconParts(type),sc=6;
 const url=await rasterSVG(buildSVG(inner,vb,vb[2]*sc,vb[3]*sc),vb[2]*sc,vb[3]*sc,'image/png');return(iconCache[type]={url,w:vb[2],h:vb[3]})}

/* ===== parts list data ===== */
function specOf(c){const d=D[c.type],o=[];for(const k in d.p){const[,u,nm]=d.p[k];if(u==='txt')continue;o.push(`${nm}: ${c.p[k]}${u?' '+u:''}`)}return o}
function bomRows(){const map=new Map(),order=[...new Set(Object.values(D).map(d=>d.cat))];
 S.comps.forEach(c=>{const d=D[c.type];if(d.bom===0)return;const key=[c.type,JSON.stringify(c.p),c.mf||'',c.pn||''].join('|');let r=map.get(key);
  if(!r){r={type:c.type,cat:d.cat,ds:d.ds,spec:specOf(c),mf:c.mf||'',pn:c.pn||'',labels:[],pages:new Set()};map.set(key,r)}r.labels.push(c.label);r.pages.add(pnum(c.pg))});
 return[...map.values()].sort((a,b)=>order.indexOf(a.cat)-order.indexOf(b.cat)||natCmp(a.ds,b.ds)).map(r=>{r.labels.sort(natCmp);return r})}

/* ===== frame for parts-list pages ===== */
function pdfFrame(doc,pw,ph){doc.setDrawColor(16,32,47);doc.setLineWidth(.6);doc.rect(10,10,pw-20,ph-20,'S')}

/* ===== parts list ===== */
async function drawBOM(doc,pw,ph,needAdd,prog){
 const rows=bomRows(),total=rows.reduce((a,r)=>a+r.labels.length,0),m=10;
 const left=m+5,right=pw-m-5,top=m+5,bottom=ph-m-9,tw=right-left;
 const W0=[['Item',11,'c'],['Symbol',24,'c'],['Qty',11,'c'],['Designation',38],['Description',56],['Technical data',54],['Manufacturer',30],['Part no.',29],['Sheet',12,'c']],sum=W0.reduce((a,c)=>a+c[1],0),kx=tw/sum;
 const cols=[];let cx=left;W0.forEach(c=>{cols.push({h:c[0],w:c[1]*kx,x:cx,al:c[2]||'l'});cx+=c[1]*kx});
 for(const r of rows)r.icon=await iconImage(r.type);
 /* measure and paginate */
 const LH=3.3,items=[];let lastCat=null,n=0;
 doc.setFont('helvetica','normal');doc.setFontSize(7.6);
 for(const r of rows){if(r.cat!==lastCat){items.push({k:'g',cat:r.cat,h:6.5});lastCat=r.cat}
  n++;const w=i=>cols[i].w-3;
  r.l=[doc.splitTextToSize(pdfTxt(r.labels.join(', ')),w(3)),doc.splitTextToSize(pdfTxt(r.ds),w(4)),r.spec.flatMap(s=>doc.splitTextToSize(pdfTxt(s),w(5))),doc.splitTextToSize(pdfTxt(r.mf||'-'),w(6)),doc.splitTextToSize(pdfTxt(r.pn||'-'),w(7))];
  items.push({k:'r',r,n,h:Math.max(11.5,Math.max(...r.l.map(a=>a.length))*LH+4.6)})}
 items.push({k:'t',h:9});
 const y0=top+17+4+7.5,pages=[[]];let y=y0;
 items.forEach((it,i)=>{const need=it.h+(it.k==='g'?items[i+1].h:0);if(y+need>bottom&&pages[pages.length-1].length){pages.push([]);y=y0}pages[pages.length-1].push(it);y+=it.h});
 const NP=pages.length;
 for(let pi=0;pi<NP;pi++){prog&&prog(`Building parts list ${pi+1} of ${NP}…`);
  if(needAdd)doc.addPage([pw,ph],'landscape');needAdd=true;
  pdfFrame(doc,pw,ph);
  /* header band */
  doc.setFillColor(15,42,67);doc.rect(left,top,tw,17,'F');doc.setFillColor(24,160,150);doc.rect(left,top,2.4,17,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(255,255,255);doc.text('Parts list',left+7,top+8.6);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(170,200,225);doc.text(pdfTxt([S.tb.project,S.tb.dwgNo].filter(Boolean).join('  |  ')||'Untitled project'),left+7,top+13.6);
  doc.setFontSize(8);doc.setTextColor(255,255,255);doc.text(pdfTxt(`Rev. ${S.tb.rev||'-'}   ${S.tb.date||''}`),right-4,top+7,{align:'right'});
  doc.setTextColor(170,200,225);doc.text(`${total} components  |  ${rows.length} line items  |  ${S.pages.length} sheet${S.pages.length>1?'s':''}`,right-4,top+13.2,{align:'right'});
  /* table header */
  let yy=top+21;doc.setFillColor(29,68,104);doc.rect(left,yy,tw,7.5,'F');doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(255,255,255);
  cols.forEach(c=>{const tx=c.al==='c'?c.x+c.w/2:c.x+1.8;doc.text(c.h,tx,yy+4.9,{align:c.al==='c'?'center':'left'})});
  yy+=7.5;let z=0;
  for(const it of pages[pi]){
   if(it.k==='g'){doc.setFillColor(222,232,241);doc.rect(left,yy,tw,it.h,'F');doc.setFillColor(24,160,150);doc.rect(left,yy,1.2,it.h,'F');
    doc.setFont('helvetica','bold');doc.setFontSize(7.4);doc.setTextColor(15,42,67);doc.text(pdfTxt(it.cat),left+4,yy+it.h/2+1.2);z=0}
   else if(it.k==='t'){doc.setFillColor(15,42,67);doc.rect(left,yy,tw,it.h,'F');doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setTextColor(255,255,255);
    doc.text('Total components',cols[3].x+1.8,yy+it.h/2+1.4);doc.text(String(total),cols[2].x+cols[2].w/2,yy+it.h/2+1.4,{align:'center'})}
   else{const r=it.r;if(z++%2){doc.setFillColor(244,247,250);doc.rect(left,yy,tw,it.h,'F')}
    doc.setDrawColor(213,221,230);doc.setLineWidth(.15);doc.line(left,yy+it.h,right,yy+it.h);
    cols.slice(1).forEach(c=>doc.line(c.x,yy,c.x,yy+it.h));
    const tb=(lines,i,font,size,col,al)=>{doc.setFont('helvetica',font);doc.setFontSize(size);doc.setTextColor(col[0],col[1],col[2]);const c=cols[i],yb=yy+(it.h-lines.length*LH)/2+LH*.76;
     doc.text(lines,al==='c'?c.x+c.w/2:c.x+1.8,yb,{align:al==='c'?'center':'left',lineHeightFactor:LH/(size*.3528)})};
    tb([String(it.n)],0,'normal',7.5,[110,128,146],'c');
    const ic=r.icon,k=Math.min((cols[1].w-5)/ic.w,(it.h-3)/ic.h),iw=ic.w*k,ih=ic.h*k;doc.addImage(ic.url,'PNG',cols[1].x+(cols[1].w-iw)/2,yy+(it.h-ih)/2,iw,ih);
    tb([String(r.labels.length)],2,'bold',9.5,[15,42,67],'c');
    tb(r.l[0],3,'bold',7.6,[15,42,67]);tb(r.l[1],4,'normal',7.6,[23,40,58]);tb(r.l[2],5,'normal',7,[75,95,115]);
    tb(r.l[3],6,'normal',7.4,r.mf?[23,40,58]:[170,180,190]);tb(r.l[4],7,'normal',7.4,r.pn?[23,40,58]:[170,180,190]);
    tb([[...r.pages].sort((a,b)=>a-b).join(', ')],8,'normal',7.4,[75,95,115],'c')}
   yy+=it.h}
  /* column hairlines + outer edge of table body */
  doc.setDrawColor(15,42,67);doc.setLineWidth(.3);doc.line(left,yy,right,yy);
  doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(120,135,150);doc.text(`Generated with ElectroSim  |  page ${pi+1} of ${NP}`,left,ph-m-2.6);
  }
 return NP}

async function exportPDF(opt,prog){
 const J=window.jspdf&&window.jspdf.jsPDF;if(!J)throw new Error('PDF library (js/vendor/jspdf.umd.min.js) did not load');
 const[pw,ph]=PAPER[S.tb.paper]||PAPER.A4,doc=new J({orientation:'landscape',unit:'mm',format:[pw,ph],compress:true});let first=1;
 if(opt.sheets)for(let i=0;i<S.pages.length;i++){prog&&prog(`Rendering sheet ${i+1} of ${S.pages.length}…`);
  const url=await sheetImage(i);if(!first)doc.addPage([pw,ph],'landscape');first=0;doc.addImage(url,'JPEG',0,0,pw,ph,undefined,'FAST')}
 if(opt.bom)await drawBOM(doc,pw,ph,!first,prog);
 doc.setProperties({title:pdfTxt(S.tb.project||'ElectroSim drawing'),author:'',creator:'ElectroSim'});
 return doc}
