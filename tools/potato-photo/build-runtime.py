from pathlib import Path
import json
entries=json.loads(Path('assets/potato-photo/manifest.json').read_text())
runtime=[{k:e[k] for k in ['name','family','raw','path','url','bounds']} for e in entries]
for e in runtime:
 if e['path']==e['raw']: del e['path']
code='''/* Prerendered photographic base potatoes. No gameplay state, RNG or frame loop. */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg',base=document.currentScript.src;
const entries=ENTRIES;entries.forEach(e=>{if(!e.path)e.path=e.raw});
const lookup=new Map(entries.map(e=>[e.raw,e])),loads=new Map();let serial=0;
function preload(shapes){
 const selected=shapes?shapes.map(s=>lookup.get(s.raw||s.path)).filter(Boolean):entries.slice(0,11);
 return Promise.all([...new Set(selected)].map(e=>{
  if(!loads.has(e.url))loads.set(e.url,new Promise(resolve=>{
   const i=new Image();i.onload=()=>resolve(true);i.onerror=()=>{loads.delete(e.url);resolve(false)};i.src=new URL(e.url,base).href;
  }));return loads.get(e.url);
 }));
}
function create(shape,outline){
 if(shape.animal||shape.flower)return null;
 const entry=lookup.get(shape.path);if(!entry)return null;
 const svg=document.createElementNS(NS,'svg'),key='photo-base-'+(++serial);
 svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');svg.classList.add('shape-3d','potato-piece','photo-potato');
 svg.dataset.rendering='photographic';svg.dataset.asset=entry.name;
 const el=(tag,attrs,parent)=>{const node=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);parent.append(node);return node};
 const defs=el('defs',{},svg),clip=el('clipPath',{id:key,clipPathUnits:'userSpaceOnUse'},defs);
 el('path',{d:outline,'clip-rule':'evenodd'},clip);
 const body=el('g',{transform:'rotate('+(shape.rotation||0)+' 50 50)'},svg);
 // Preserve the exact logical contour and fill only tiny registration edge gaps.
 const front=el('path',{d:outline,'fill-rule':'evenodd',class:'front-face'},body);
 front.style.fill='#af875b';front.style.stroke='none';
 const [x,y,width,height]=entry.bounds;
 el('image',{x,y,width,height,href:new URL(entry.url,base).href,preserveAspectRatio:'none','clip-path':'url(#'+key+')',class:'photo-potato-art'},body);
 return svg;
}
window.PhotoPotatoes=Object.freeze({create,preload,entries});
})();
'''.replace('ENTRIES',json.dumps(runtime,separators=(',',':')))
Path('photo-potatoes.js').write_text(code)
