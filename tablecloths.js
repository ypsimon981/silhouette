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
function apply(board,index){
 if(!board||!Number.isInteger(index)||!textures[index])return Promise.resolve(false);
 const token={};selected.set(board,token);
 return texture(index).then(url=>{
  if(selected.get(board)!==token)return false;
  board.style.setProperty('--arena-art','url("'+url+'")');
  board.style.setProperty('--cloth-color',textures[index].color);
  board.style.setProperty('--cloth-size','cover');
  board.dataset.photoCloth=textures[index].id;
  return true;
 }).catch(()=>false); // Existing CSS fabric remains the fallback.
}
window.Tablecloths=Object.freeze({apply,textures});
loadAtlas().catch(()=>{});
})();