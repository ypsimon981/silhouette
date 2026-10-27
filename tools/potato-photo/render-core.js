/* Offline UV projection of approved photographed convex potato surfaces.
 * Only the output WebP sprites ship to the game; this code never runs while playing. */
window.initPotatoRenderer=async sources=>{
 const size=512,scale=size/100;
 function field(path){
  const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.fill(new Path2D(path),'evenodd');
  const rgba=ctx.getImageData(0,0,size,size).data,alpha=new Uint8Array(size*size),distance=new Float32Array(size*size);
  for(let i=0;i<alpha.length;i++){alpha[i]=rgba[i*4+3];distance[i]=alpha[i]>127?1000:0;}
  const diag=Math.SQRT2;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x;if(!distance[i])continue;let d=distance[i];if(x)d=Math.min(d,distance[i-1]+1);if(y){d=Math.min(d,distance[i-size]+1);if(x)d=Math.min(d,distance[i-size-1]+diag);if(x<size-1)d=Math.min(d,distance[i-size+1]+diag);}distance[i]=d;}
  for(let y=size-1;y>=0;y--)for(let x=size-1;x>=0;x--){const i=y*size+x;if(!distance[i])continue;let d=distance[i];if(x<size-1)d=Math.min(d,distance[i+1]+1);if(y<size-1){d=Math.min(d,distance[i+size]+1);if(x)d=Math.min(d,distance[i+size-1]+diag);if(x<size-1)d=Math.min(d,distance[i+size+1]+diag);}distance[i]=d;}
  let cx=256,cy=256;if(!alpha[cy*size+cx]){let best=0;for(let i=0;i<distance.length;i++)if(distance[i]>distance[best])best=i;cx=best%size;cy=Math.floor(best/size);}
  const radii=new Float32Array(2048);
  for(let a=0;a<radii.length;a++){
   const angle=a*2*Math.PI/radii.length,dx=Math.cos(angle),dy=Math.sin(angle);let last=0;
   for(let r=0;r<720;r+=.5){const x=Math.round(cx+dx*r),y=Math.round(cy+dy*r);if(x<0||y<0||x>=size||y>=size)break;if(alpha[y*size+x]>127)last=r;}
   radii[a]=Math.max(1,last);
  }
  return{alpha,distance,cx,cy,radii};
 }
 const materials=[];
 for(const src of sources){
  const image=new Image();image.src=src.data;await image.decode();const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.drawImage(image,...src.bounds.map(n=>n*scale));
  materials.push({...field(src.path),pixels:ctx.getImageData(0,0,size,size).data,name:src.name});
 }
 function radius(f,a){const p=((a/(2*Math.PI)%1+1)%1)*2048,i=Math.floor(p),t=p-i;return f.radii[i]*(1-t)+f.radii[(i+1)%2048]*t;}
 window.renderPotato=shape=>{
  let hash=2166136261;for(const c of shape.raw)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  let material=materials[hash%3],phase=((hash>>>8)%8)*Math.PI/4;
  if(shape.family==='cross3'||/^organic[456]-2$/.test(shape.family)){material=materials.find(m=>m.name==='star-1');phase=(hash%4)*Math.PI/2;}
  if(/^organic[456]-3$/.test(shape.family)){material=materials.find(m=>m.name==='star-2');phase=(hash%5)*Math.PI*2/5;}
  if(/^organic[456]-1$/.test(shape.family)){material=materials.find(m=>m.name==='triangle');phase=(hash%3)*Math.PI*2/3;}
  if(shape.family==='diamond3'){material=materials.find(m=>m.name==='square');phase=Math.PI/4;}
  const target=field(shape.path);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),out=ctx.createImageData(size,size),pixels=out.data;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=y*size+x,alpha=target.alpha[i];if(!alpha)continue;
   const dx=x-target.cx,dy=y-target.cy,angle=Math.atan2(dy,dx),r=Math.min(.985,Math.hypot(dx,dy)/radius(target,angle));
   const a=angle+phase,sr=radius(material,a)*r,sx=Math.max(0,Math.min(510,material.cx+Math.cos(a)*sr)),sy=Math.max(0,Math.min(510,material.cy+Math.sin(a)*sr));
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,at=(iy*size+ix)*4;
   const d=target.distance[i],rim=Math.max(0,1-d/(scale*3));
   // A restrained contact rim follows actual local normals, including concave edges.
   const gx=target.distance[i+1]-(target.distance[i-1]||0),gy=(target.distance[i+size]||0)-(target.distance[i-size]||0),n=Math.hypot(gx,gy)||1;
   const light=1-rim*(.09+.04*(gx+gy)/n);
   for(let k=0;k<3;k++)pixels[i*4+k]=Math.max(0,Math.min(255,((material.pixels[at+k]*(1-fx)+material.pixels[at+4+k]*fx)*(1-fy)+(material.pixels[at+size*4+k]*(1-fx)+material.pixels[at+size*4+4+k]*fx)*fy)*light));
   pixels[i*4+3]=alpha;
  }
  ctx.putImageData(out,0,0);return{data:canvas.toDataURL('image/png').split(',')[1],material:material.name,phase};
 };
};
