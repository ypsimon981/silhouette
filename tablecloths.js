/* Static photographic cloths. No pointer listeners, animation loop or gameplay RNG. */
(function(){
'use strict';
const atlasURL=new URL('./assets/tablecloths/linen-atlas.png',document.currentScript.src).href;
const textures=Object.freeze([
{id:'blue-windowpane',name:'Quadri blu',color:'#e3dfd2'},
{id:'sage-ticking',name:'Righe salvia',color:'#e3dfd2'},
{id:'red-gingham',name:'Quadretti rossi',color:'#e3d8ca'},
{id:'oat-herringbone',name:'Spigato naturale',color:'#ddd4c3'},
{id:'cream-damask',name:'Damasco avorio',color:'#e4dfd1'},
{id:'plain-flax',name:'Lino naturale',color:'#e0d9ca'}
].map(Object.freeze));
const selected=new WeakMap(),cache=new Map();
let atlasPromise;
function loadAtlas(){
 if(!atlasPromise)atlasPromise=new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>{atlasPromise=undefined;reject(new Error('Tablecloth atlas unavailable'));};
  image.src=atlasURL;
 });
 return atlasPromise;
}
function texture(index){
 if(!cache.has(index)){
  const pending=loadAtlas().then(image=>{
   const canvas=document.createElement('canvas');
   canvas.width=canvas.height=512;
   const context=canvas.getContext('2d');
   if(!context)throw new Error('Canvas 2D unavailable');
   const width=image.naturalWidth/3,height=image.naturalHeight/2;
   // Remove panel boundaries to prevent neighbouring textiles bleeding in.
   context.drawImage(image,(index%3)*width+1,Math.floor(index/3)*height+1,width-2,height-2,0,0,512,512);
   const url=canvas.toDataURL('image/webp',.9),decoded=new Image();
   decoded.src=url;
   return(decoded.decode?decoded.decode():Promise.resolve()).then(()=>url);
  }).catch(error=>{cache.delete(index);throw error;});
  cache.set(index,pending);
 }
 return cache.get(index);
}
const tileCache=new Map();
let linenPromise;
function loadLinen(){
 if(!linenPromise)linenPromise=new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);
  image.onerror=()=>{linenPromise=undefined;reject(new Error('Linen unavailable'));};
  image.src=new URL('./linen-fine.webp',atlasURL).href;
 });
 return linenPromise;
}
function tileTexture(index){
 if(!tileCache.has(index))tileCache.set(index,loadLinen().then(image=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d');if(!c)throw new Error('Canvas unavailable');
  // Mirrored texture addressing makes opposite borders match exactly.
  // Four reflected quadrants retain the photographic fibres without stretching.
  for(let y=0;y<2;y++)for(let x=0;x<2;x++){
   c.save();c.translate(x?512:0,y?512:0);c.scale(x?-1:1,y?-1:1);
   c.drawImage(image,0,0,256,256);c.restore();
  }
  c.globalCompositeOperation='multiply';
  if(index===0){
   c.fillStyle='rgba(72,106,132,.3)';for(let p=0;p<512;p+=64){c.fillRect(p,0,3,512);c.fillRect(0,p,512,3);c.fillRect(p+6,0,1,512);c.fillRect(0,p+6,512,1);}
  }else if(index===1){
   c.fillStyle='rgba(67,98,70,.27)';for(let p=0;p<512;p+=64){c.fillRect(p,0,4,512);c.fillRect(p+8,0,2,512);}
  }else if(index===2){
   c.fillStyle='rgba(152,65,48,.2)';for(let p=0;p<512;p+=64){c.fillRect(p,0,32,512);c.fillRect(0,p,512,32);}
  }else if(index===3){
   c.strokeStyle='rgba(120,99,68,.13)';c.lineWidth=1;
   for(let y=-32;y<544;y+=8)for(let x=0;x<512;x+=32){c.beginPath();c.moveTo(x,y);c.lineTo(x+16,y+8);c.lineTo(x+32,y);c.stroke();}
  }else if(index===4){
   c.strokeStyle='rgba(122,109,85,.12)';c.lineWidth=1.5;
   for(let y=0;y<=512;y+=128)for(let x=0;x<=512;x+=128){
    for(let a=0;a<4;a++){c.save();c.translate(x,y);c.rotate(a*Math.PI/2);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-23,-24,-20,-45,0,-54);c.bezierCurveTo(20,-45,23,-24,0,0);c.stroke();c.restore();}
   }
  }
  const url=canvas.toDataURL('image/png'),decoded=new Image();decoded.src=url;
  return(decoded.decode?decoded.decode():Promise.resolve()).then(()=>url);
 }).catch(error=>{tileCache.delete(index);throw error;}));
 return tileCache.get(index);
}
function apply(board,index,tiled=false){
 if(!board||!Number.isInteger(index)||!textures[index])return Promise.resolve(false);
 const token={};selected.set(board,token);
 return(tiled?tileTexture(index):texture(index)).then(url=>{
  if(selected.get(board)!==token)return false;
  board.style.setProperty('--arena-art','url("'+url+'")');
  board.style.setProperty('--cloth-color',textures[index].color);
  board.style.setProperty('--cloth-size',tiled?'256px 256px':'cover');
  board.dataset.photoCloth=textures[index].id;
  if(tiled)board.dataset.tileCloth='true';else delete board.dataset.tileCloth;
  return true;
 }).catch(()=>false);
}
function applyAnimals(board){
 if(!board)return Promise.resolve(false);
 selected.set(board,{}); // Invalidate pending backgrounds from the previous mode.
 board.dataset.photoCloth='animal-tracks';delete board.dataset.tileCloth;
 return Promise.resolve(true);
}
window.Tablecloths=Object.freeze({apply,applyAnimals,textures});
})();
