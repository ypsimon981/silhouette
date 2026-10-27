/* Static flour targets. Uses the exact potato path; no gameplay RNG or frame loop. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg',cache=new Map(),size=512,pad=16,extent=132,scale=size/extent;
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
 // Cross-section of a flour well: feathered foot, rising outer slope,
 // bright crest and a steeper shaded inner wall, entirely outside the opening.
 for(const [width,tone] of [[27.4,'#d4cbbb'],[26.4,'#e4ded1'],[24.4,'#ede8dd'],[22.1,'#f3efe5'],[19.3,'#faf7ee'],[16,'#fffdf5'],[12.3,'#e8e1d4'],[8.7,'#d6cdbd'],[5.3,'#c4b9a6']]){
  c.strokeStyle=tone;c.lineWidth=width;c.stroke(path);
 }
 const samples=Array.from({length:Math.max(3,Math.ceil(length))},(_,i)=>probe.getPointAtLength(i*length/Math.max(3,Math.ceil(length))));
 for(let i=0;i<samples.length;i++){
  const p=samples[i],a=samples[(i+samples.length-1)%samples.length],b=samples[(i+1)%samples.length];
  const dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1;
  let nx=-dy/n,ny=dx/n;
  if(hit.isPointInPath(path,p.x+nx*.45,p.y+ny*.45,'evenodd')){nx=-nx;ny=-ny;}
  // Keep granular texture inside a broad, regular outer bank.
  for(let j=0;j<15;j++){
   const outer=j>9,dist=outer?11.5+random()*1.8:random()*12.5;
   const tangent=(random()-.5)*1.1,x=p.x+nx*dist+dx/n*tangent,y=p.y+ny*dist+dy/n*tangent;
   c.globalAlpha=outer?.18+random()*.22:.35+random()*.45;
   const light=dist<3.5?['#b5a891','#d8cebd','#ede5d7']:dist<9.1?['#fffef8','#f8f4e9','#e4dccd']:['#efe9dd','#ded5c5','#faf7ef'];
   c.fillStyle=light[Math.floor(random()*light.length)];c.beginPath();
   const r=outer?.12+random()*.23:.2+random()*.6;
   c.ellipse(x,y,r,r*(.55+random()*.65),random()*Math.PI,0,Math.PI*2);c.fill();
  }
 }
 // Bound the outer edge to one uniform offset, including every powder grain.
 c.globalAlpha=1;c.globalCompositeOperation='destination-in';c.lineWidth=27.4;c.strokeStyle='#fff';c.stroke(path);
 c.globalCompositeOperation='destination-out';c.fill(path,'evenodd');
 // A thin, continuous, equally weighted contour. No interior tint or inner shadow.
 c.globalCompositeOperation='source-over';c.strokeStyle='#514334';c.lineWidth=.72;c.stroke(path);
 const url=canvas.toDataURL('image/png');if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(d,url);return url;
}
function create(d,rotation){
 const url=bake(d),svg=el('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'flour-slot'});
 const g=el('g',{transform:'rotate('+rotation+' 50 50)'},svg);
 el('image',{x:-pad,y:-pad,width:extent,height:extent,href:url,class:'flour-art'},g);
 // Retain the original vector bounds used by results layout; never a filled cavity.
 el('path',{d,'fill-rule':'evenodd',class:'recess-floor'},g);
 return svg;
}
window.PotatoFlour=Object.freeze({create});
})();
