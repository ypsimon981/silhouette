/* Cosmetic only: actual-position soft shadows. No game RNG, scoring or geometry changes. */
(()=>{'use strict';
 const board=document.getElementById('board');if(!board)return;
 const NS='http://www.w3.org/2000/svg',mounted=new WeakMap();let serial=0,queued=0;
 const opacity={contact:.36,cast:.30,air:.23};
 function el(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(parent)parent.appendChild(n);return n;}
 function projection(x,y,lift,rect,pieceWidth=Math.min(rect.width,rect.height)*.82){
  const unit=Math.min(rect.width,rect.height),lightHeight=unit*.38,height=pieceWidth*(.055+lift*.10),ratio=height/(lightHeight-height);
  return {x:(x-.5)*rect.width*ratio,y:(y-.5)*rect.height*ratio,scale:1+ratio*.22};
 }
 function mount(piece){
  if(mounted.has(piece))return mounted.get(piece);
  const art=piece.querySelector(':scope > svg:not(.ground-shadow)'),outline=art?.querySelector('.front-face,.animal-outline')||art?.querySelector(':scope > path');if(!outline)return null;
  // Reuse the existing visible silhouette, including its catalog rotation.
  const shadow=el('svg',{viewBox:art.getAttribute('viewBox')||'0 0 100 100',class:'ground-shadow central-shadow','aria-hidden':'true',focusable:'false'}),id='central-shadow-'+(++serial),defs=el('defs',{},shadow);
  const layers=[];
  for(const [name,blur] of [['contact',.60],['cast',2.7],['air',4.9]]){
   const filter=el('filter',{id:id+'-'+name,filterUnits:'userSpaceOnUse',x:-100,y:-100,width:300,height:300,'color-interpolation-filters':'sRGB'},defs);el('feGaussianBlur',{stdDeviation:blur},filter);
   const group=el('g',{'data-shadow-layer':name,filter:'url(#'+id+'-'+name+')'},shadow),path=el('path',{d:outline.getAttribute('d'),'fill-rule':outline.getAttribute('fill-rule')||'evenodd'},group);
   path.style.setProperty('fill','#262019','important');path.style.setProperty('stroke','none','important');path.style.setProperty('filter','none','important');
   group.style.filter='url(#'+id+'-'+name+')';layers.push({group,path});
  }
  // Replace the previous cosmetic shadow; never touch the potato SVG itself.
  piece.querySelectorAll(':scope > svg.ground-shadow').forEach(s=>s.remove());piece.dataset.groundShadow='central';piece.dataset.centralShadow='true';piece.prepend(shadow);
  const info={shadow,art,outline,layers};mounted.set(piece,info);return info;
 }
 function outlineTransform(info){
  try{const root=info.art.getCTM(),path=info.outline.getCTM();if(root&&path){const m=root.inverse().multiply(path);return 'matrix('+[m.a,m.b,m.c,m.d,m.e,m.f].join(' ')+')';}}catch(_){}
  return info.outline.getAttribute('transform')||'';
 }
 function setAttr(node,key,value){if(node.getAttribute(key)!==value)node.setAttribute(key,value);}
 function refresh(){
  queued=0;const b=board.getBoundingClientRect();if(!b.width||!b.height)return;
  for(const piece of board.querySelectorAll(':scope > .piece')){
   const info=mount(piece);if(!info)continue;const p=piece.getBoundingClientRect();if(!p.width||!p.height)continue;
   const lift=piece.classList.contains('drag')?1:0,x=(p.left+p.width/2-b.left)/b.width,y=(p.top+p.height/2-b.top)/b.height,pr=projection(x,y,lift,b,p.width),dx=pr.x*100/p.width,dy=pr.y*100/p.height,transform=outlineTransform(info);
   info.layers.forEach(({path})=>setAttr(path,'transform',transform));
   const [contact,cast,air]=info.layers.map(l=>l.group),project='translate('+dx.toFixed(3)+' '+dy.toFixed(3)+') translate(50 50) scale('+pr.scale.toFixed(5)+') translate(-50 -50)';
   setAttr(contact,'transform','translate(50 50) scale(1.012) translate(-50 -50)');setAttr(contact,'opacity',String(opacity.contact*(1-lift*.7)));
   setAttr(cast,'transform',project);setAttr(cast,'opacity',String(opacity.cast*(1-lift)));
   setAttr(air,'transform',project);setAttr(air,'opacity',String(opacity.air*lift));
   info.shadow.dataset.offsetX=pr.x.toFixed(3);info.shadow.dataset.offsetY=pr.y.toFixed(3);info.shadow.dataset.lift=String(lift);
  }
 }
 function request(){if(!queued)queued=requestAnimationFrame(refresh);}
 const observer=new MutationObserver(records=>{if(records.some(r=>r.target===board||(r.type==='attributes'&&r.target.matches?.('.piece'))||(r.type==='childList'&&[...r.addedNodes].some(n=>n.matches?.('.piece')))))request();});
 observer.observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(request).observe(board);window.addEventListener('resize',request);document.addEventListener('visibilitychange',()=>{if(!document.hidden)request();});
 window.PotatoShadows={refresh:request,projection};request();
})();
