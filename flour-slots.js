/* Static flour targets. Uses the exact potato path; no gameplay RNG or frame loop. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg',cache=new Map(),size=512,pad=26,extent=152,scale=size/extent;
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(parent)parent.append(e);return e;}
let serial=0,levelSeed=0;
function beginLevel(){const seed=new Uint32Array(1);crypto.getRandomValues(seed);levelSeed=seed[0];serial=0;}
beginLevel();
function bake(d,variant){
 const key=d+'|'+variant;
 if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
 const c=canvas.getContext('2d'),hit=document.createElement('canvas').getContext('2d');
 if(!c||!hit||typeof Path2D==='undefined')throw Error('Flour canvas unavailable');
 const path=new Path2D(d),probe=el('path',{d});
 const length=probe.getTotalLength();
 let seed=(2166136261^variant)>>>0;for(let i=0;i<d.length;i++)seed=Math.imul(seed^d.charCodeAt(i),16777619);
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 c.scale(scale,scale);c.translate(pad,pad);c.lineJoin='round';c.lineCap='round';
 // Broad, non-repeating heaps, rather than a constant-width stroked ring.
 const count=Math.max(3,Math.ceil(length)),anchors=Array.from({length:Math.max(5,Math.round(length/22))},()=>random());
 const samples=Array.from({length:count},(_,i)=>probe.getPointAtLength(i*length/count));
 const edge=samples.map((p,i)=>{
  const a=samples[(i+count-1)%count],b=samples[(i+1)%count],dx=b.x-a.x,dy=b.y-a.y,n=Math.hypot(dx,dy)||1;
  let nx=-dy/n,ny=dx/n;
  if(hit.isPointInPath(path,p.x+nx*.45,p.y+ny*.45,'evenodd')){nx=-nx;ny=-ny;}
  const at=i/count*anchors.length,k=Math.floor(at),t=at-k,smooth=t*t*(3-2*t);
  const noise=anchors[k]*(1-smooth)+anchors[(k+1)%anchors.length]*smooth;
  return {x:p.x,y:p.y,nx,ny,tx:dx/n,ty:dy/n,width:8.5+noise*12+.45*Math.sin(i*.8)};
 });
 for(const [fraction,tone] of [[1,'#d4cbbb'],[.97,'#e4ded1'],[.9,'#ede8dd'],[.81,'#f3efe5'],[.7,'#faf7ee'],[.57,'#fffdf5'],[.44,'#e8e1d4'],[.31,'#d6cdbd'],[.19,'#c4b9a6']]){
  c.beginPath();edge.forEach((p,i)=>{const x=p.x+p.nx*p.width*fraction,y=p.y+p.ny*p.width*fraction;if(i)c.lineTo(x,y);else c.moveTo(x,y);});c.closePath();c.fillStyle=tone;c.fill();
 }
 for(const p of edge){
  for(let j=0;j<20;j++){
   const outer=j>13,dist=outer?p.width*(.85+random()*.25)+random()*2:random()*p.width;
   const tangent=(random()-.5)*1.8,x=p.x+p.nx*dist+p.tx*tangent,y=p.y+p.ny*dist+p.ty*tangent;
   c.globalAlpha=outer?.18+random()*.55:.35+random()*.45;
   const ratio=dist/p.width,light=ratio<.25?['#b5a891','#d8cebd','#ede5d7']:ratio<.7?['#fffef8','#f8f4e9','#e4dccd']:['#efe9dd','#ded5c5','#faf7ef'];
   c.fillStyle=light[Math.floor(random()*light.length)];c.beginPath();
   const r=outer?.12+random()*.65:.2+random()*.65;
   c.ellipse(x,y,r,r*(.55+random()*.65),random()*Math.PI,0,Math.PI*2);c.fill();
  }
 }
 c.globalAlpha=1;c.globalCompositeOperation='destination-out';c.fill(path,'evenodd');
 // A thin, continuous, equally weighted contour. No interior tint or inner shadow.
 c.globalCompositeOperation='source-over';c.strokeStyle='#514334';c.lineWidth=.72;c.stroke(path);
 const url=canvas.toDataURL('image/png');if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,url);return url;
}
function create(d,rotation,variant){
 if(variant===undefined)variant=(levelSeed+Math.imul(++serial,2654435761))>>>0;
 const url=bake(d,variant),svg=el('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'flour-slot'});
 const g=el('g',{transform:'rotate('+rotation+' 50 50)'},svg);
 el('image',{x:-pad,y:-pad,width:extent,height:extent,href:url,class:'flour-art'},g);
 // Retain the original vector bounds used by results layout; never a filled cavity.
 el('path',{d,'fill-rule':'evenodd',class:'recess-floor'},g);
 return svg;
}
window.PotatoFlour=Object.freeze({create,beginLevel});
})();
