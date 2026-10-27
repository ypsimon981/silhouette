/* Static flour targets. Uses the exact potato path; no gameplay RNG or frame loop. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg',cache=new Map(),size=512,pad=10,scale=size/120;
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(parent)parent.append(e);return e;}
function bake(d){
 if(cache.has(d))return cache.get(d);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d'),hit=document.createElement('canvas').getContext('2d');
 if(!c||!hit||typeof Path2D==='undefined')throw Error('Flour canvas unavailable');
 const path=new Path2D(d),probe=el('path',{d});
 const length=probe.getTotalLength();
 let seed=2166136261;for(let i=0;i<d.length;i++)seed=Math.imul(seed^d.charCodeAt(i),16777619);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 c.scale(scale,scale);c.translate(pad,pad);c.lineJoin='round';c.lineCap='round';
 // Flour is outside the silhouette. The opening is cleared exactly after all grains.
 c.strokeStyle='#d1c0a4';c.lineWidth=8.6;c.stroke(path);
 c.strokeStyle='#e4d6bd';c.lineWidth=8.2;c.stroke(path);
 c.strokeStyle='#f7edd8';c.lineWidth=7.8;c.stroke(path);
 const shades=['#fff8e8','#f9efdc','#eee1c8','#ded0b7','#fffdf3'];
 const samples=Array.from({length:Math.max(3,Math.ceil(length))},(_,i)=>probe.getPointAtLength(i*length/Math.max(3,Math.ceil(length))));
 for(let i=0;i<samples.length;i++){
  const p=samples[i],a=samples[(i+samples.length-1)%samples.length],b=samples[(i+1)%samples.length];
  const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1;
  let nx=-dy/n,ny=dx/n;
  if(hit.isPointInPath(path,p.x+nx*.45,p.y+ny*.45,'evenodd')){nx=-nx;ny=-ny;}
  // Cluster the loose powder on the outer edge; the core has uniform thickness.
  for(let j=0;j<15;j++){
   const outer=j>9,dist=outer?3.4+random()*2.4:random()*4.1;
   const tangent=(random()-.5)*1.1,x=p.x+nx*dist+dx/n*tangent,y=p.y+ny*dist+dy/n*tangent;
   c.globalAlpha=outer?.5+random()*.5:.55+random()*.45;
   c.fillStyle=shades[Math.floor(random()*shades.length)];c.beginPath();
   const r=outer?.18+random()*.62:.12+random()*.34;
   c.ellipse(x,y,r,r*(.55+random()*.65),random()*Math.PI,0,Math.PI*2);c.fill();
  }
 }
 c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.fill(path,'evenodd');
 // A thin, continuous, equally weighted contour. No interior tint or inner shadow.
 c.globalCompositeOperation='source-over';c.strokeStyle='#514334';c.lineWidth=.72;c.stroke(path);
 const url=canvas.toDataURL('image/png');if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(d,url);return url;
}
function create(d,rotation){
 const url=bake(d),svg=el('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'flour-slot'});
 const g=el('g',{transform:'rotate('+rotation+' 50 50)'},svg);
 el('image',{x:-pad,y:-pad,width:120,height:120,href:url,class:'flour-art'},g);
 // Retain the original vector bounds used by results layout; never a filled cavity.
 el('path',{d,'fill-rule':'evenodd',class:'recess-floor'},g);
 return svg;
}
window.PotatoFlour=Object.freeze({create});
})();
