/* Cosmetic only. Cache soft alpha rasters; movement updates only the moving piece. */
(()=>{'use strict';
 const board=document.getElementById('board');if(!board)return;
 const NS='http://www.w3.org/2000/svg',mounted=new WeakMap(),cache=new Map(),dirty=new Set();let full=true,queued=0,boardSize={width:0,height:0};
 function projection(x,y,lift,rect,pieceWidth=Math.min(rect.width,rect.height)*.82){
  const unit=Math.min(rect.width,rect.height),lightHeight=unit*.38,height=pieceWidth*(.055+lift*.10),ratio=height/(lightHeight-height);
  return {x:(x-.5)*rect.width*ratio,y:(y-.5)*rect.height*ratio,scale:1+ratio*.22};
 }
 // Portable blur, independent of Canvas filter support. Once per silhouette/rotation.
 function blurPass(src,r,horizontal,n){const out=new Float32Array(src.length),divisor=r*2+1;for(let row=0;row<n;row++){let sum=0;const index=k=>horizontal?row*n+k:k*n+row;for(let k=0;k<=r;k++)sum+=src[index(k)];for(let k=0;k<n;k++){out[index(k)]=sum/divisor;if(k-r>=0)sum-=src[index(k-r)];if(k+r+1<n)sum+=src[index(k+r+1)];}}return out;}
 // Expensive blur preparation runs off the input/UI thread when Workers are allowed.
 let worker=null,jobSerial=0;const jobs=new Map();
 const idle=()=>new Promise(resolve=>{'requestIdleCallback'in window?requestIdleCallback(resolve,{timeout:200}):setTimeout(resolve,0);});
 async function fallbackBlur(alpha,n){const result=[];for(const radius of [2,7,13]){let a=alpha;for(let k=0;k<3;k++){await idle();a=blurPass(a,radius,true,n);await idle();a=blurPass(a,radius,false,n);}result.push(a);}return result;}
 try{const source='const blurPass='+blurPass.toString()+';self.onmessage=({data})=>{const {id,alpha,n}=data;const values=[2,7,13].map(radius=>{let a=alpha;for(let k=0;k<3;k++){a=blurPass(a,radius,true,n);a=blurPass(a,radius,false,n);}return a;});self.postMessage({id,values},values.map(v=>v.buffer));};';const url=URL.createObjectURL(new Blob([source],{type:'application/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);worker.onmessage=({data})=>{const job=jobs.get(data.id);if(job){jobs.delete(data.id);job.resolve(data.values);}};worker.onerror=e=>{e.preventDefault();worker?.terminate();worker=null;for(const job of jobs.values())fallbackBlur(job.alpha,job.n).then(job.resolve,job.reject);jobs.clear();};}catch(_){worker=null;}
 function prepareBlur(alpha,n){if(!worker)return fallbackBlur(alpha,n);return new Promise((resolve,reject)=>{const id=++jobSerial;jobs.set(id,{resolve,reject,alpha,n});worker.postMessage({id,alpha,n});});}
 function rasters(d,transform,rule){const key=d+'|'+transform+'|'+rule;if(cache.has(key))return cache.get(key);
  const task=new Promise((resolve,reject)=>{const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-12.5 -12.5 125 125');svg.setAttribute('width','320');svg.setAttribute('height','320');const path=document.createElementNS(NS,'path');path.setAttribute('d',d);path.setAttribute('fill','#262019');path.setAttribute('fill-rule',rule);if(transform)path.setAttribute('transform',transform);svg.append(path);const image=new Image();
   image.onload=async()=>{try{const n=320,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,n,n);const rgba=ctx.getImageData(0,0,n,n).data,alpha=new Float32Array(n*n);for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];const values=await prepareBlur(alpha,n),result=values.map(a=>{const im=ctx.createImageData(n,n);for(let i=0;i<a.length;i++){im.data[i*4]=38;im.data[i*4+1]=32;im.data[i*4+2]=25;im.data[i*4+3]=a[i];}ctx.putImageData(im,0,0);return c.toDataURL();});resolve(result);}catch(e){reject(e);}};image.onerror=()=>reject(Error('Shadow silhouette decode failed'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));
  });cache.set(key,task);return task;
 }
 function mount(piece){if(mounted.has(piece))return mounted.get(piece);
  const art=piece.querySelector(':scope > svg:not(.ground-shadow)'),outline=art?.querySelector('.front-face,.animal-outline')||art?.querySelector(':scope > path');if(!outline)return null;
  let transform=outline.getAttribute('transform')||'';try{const root=art.getCTM(),path=outline.getCTM();if(root&&path){const m=root.inverse().multiply(path);transform='matrix('+[m.a,m.b,m.c,m.d,m.e,m.f].map(n=>Math.abs(n)<1e-7?0:+n.toFixed(6)).join(' ')+')';}}catch(_){}
  const shadow=document.createElement('div');shadow.className='ground-shadow central-shadow';shadow.setAttribute('aria-hidden','true');shadow.dataset.outline=outline.getAttribute('d');shadow.dataset.outlineTransform=transform;shadow.dataset.ready='false';
  const layers=['contact','cast','air'].map(name=>{const layer=document.createElement('div');layer.className='shadow-layer';layer.dataset.shadowLayer=name;const img=new Image();img.alt='';img.draggable=false;layer.append(img);shadow.append(layer);return {layer,img};});
  piece.querySelectorAll(':scope > .ground-shadow').forEach(s=>s.remove());piece.dataset.groundShadow='central';piece.dataset.centralShadow='true';piece.prepend(shadow);
  const info={shadow,art,layers,width:0,scale:1,position:''};mounted.set(piece,info);
  rasters(outline.getAttribute('d'),transform,outline.getAttribute('fill-rule')||'evenodd').then(async urls=>{await Promise.all(layers.map(({img},i)=>{img.src=urls[i];return img.decode();}));if(piece.isConnected){shadow.dataset.ready='true';dirty.add(piece);request();}}).catch(()=>{shadow.dataset.ready='failed';});return info;
 }
 function coordinate(value,span){return value.endsWith('%')?parseFloat(value)*span/100:parseFloat(value);}
 function refresh(){queued=0;let all;
  if(full){boardSize={width:board.clientWidth,height:board.clientHeight};all=[...board.querySelectorAll(':scope > .piece')];}else all=[...dirty].filter(p=>p.isConnected);
  const resize=full;full=false;dirty.clear();if(!boardSize.width||!boardSize.height)return;
  // Mount/read geometry only at creation, resize or board state changes. No CTM or
  // layout reads on pointer movement; seated potatoes are not revisited per frame.
  const entries=all.map(piece=>{const info=mount(piece);if(!info)return null;if(resize||!info.width){info.width=piece.clientWidth;info.scale=info.width?piece.getBoundingClientRect().width/info.width:1;}return {piece,info};}).filter(Boolean);
  for(const {piece,info}of entries){if(piece.classList.contains('done')&&!info.seated){info.seated=true;piece.dataset.seatPop='true';setTimeout(()=>{if(piece.isConnected)delete piece.dataset.seatPop;},460);}
   const lift=piece.classList.contains('drag')?1:0,x=coordinate(piece.style.left||'50%',boardSize.width)/boardSize.width,y=coordinate(piece.style.top||'50%',boardSize.height)/boardSize.height,pr=projection(x,y,lift,boardSize,info.width*info.scale),dx=pr.x/info.scale,dy=pr.y/info.scale;
   const [contact,cast,air]=info.layers.map(s=>s.layer),project='translate('+dx.toFixed(3)+'px,'+dy.toFixed(3)+'px) scale('+pr.scale.toFixed(5)+')';
   contact.style.transform='scale(1.012)';contact.style.opacity=String(.36*(1-lift*.7));cast.style.transform=air.style.transform=project;cast.style.opacity=String(.30*(1-lift));air.style.opacity=String(.23*lift);
   info.shadow.dataset.offsetX=pr.x.toFixed(3);info.shadow.dataset.offsetY=pr.y.toFixed(3);info.shadow.dataset.lift=String(lift);info.position=piece.style.left+'|'+piece.style.top+'|'+lift;
  }
 }
 function request(){if(!queued)queued=requestAnimationFrame(refresh);}
 function resize(){full=true;request();}
 const observer=new MutationObserver(records=>{for(const r of records){if(r.target===board){if(r.type==='attributes')full=true;else for(const n of r.addedNodes)if(n.matches?.('.piece'))dirty.add(n);}else if(r.type==='attributes'&&r.target.matches?.('.piece')){const p=r.target,info=mounted.get(p),position=p.style.left+'|'+p.style.top+'|'+(p.classList.contains('drag')?1:0);if(!info||info.position!==position)dirty.add(p);}}if(full||dirty.size)request();});
 observer.observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(board);window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{if(!document.hidden)resize();});
 window.PotatoShadows={refresh:resize,projection};request();
})();
