/* Cosmetic conversations between seated potatoes. No score, audio or game RNG access. */
(()=>{
 const board=document.getElementById('board');if(!board)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pick=n=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n};
 const seated=()=>board.classList.contains('game-screen')?[...board.querySelectorAll('.piece.done')]:[];
 const seatedBefore=new WeakSet();
 let timers=new Set(),loop=0,running=false,dragging=false,lastStarter=null,gazeFrame=0;
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
 const moods=['cheeky','laugh','surprise','curious'];
 function reset(p){delete p.dataset.peerMood;delete p.dataset.peerBusy;p.style.removeProperty('--peer-x');p.style.removeProperty('--peer-y')}
 function stop(){clearTimeout(loop);timers.forEach(clearTimeout);timers.clear();running=false;board.querySelectorAll('[data-peer-busy]').forEach(reset)}
 function aim(a,b){const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dx=br.left-ar.left,dy=br.top-ar.top,len=Math.hypot(dx,dy)||1;a.style.setProperty('--peer-x',(dx/len*12).toFixed(1)+'px');a.style.setProperty('--peer-y',(dy/len*8).toFixed(1)+'px')}
 function emote(a,b,mood){if(!a.isConnected||!b.isConnected)return;a.dataset.peerBusy='true';aim(a,b);a.dataset.peerMood=mood;later(()=>reset(a),1250)}
 function schedule(ms=2600+pick(2500)){clearTimeout(loop);if(board.classList.contains('complete')&&seated().length>1&&!document.hidden&&!reduced.matches&&!dragging)loop=setTimeout(conversation,ms)}
 function conversation(){
  const all=seated();if(!board.classList.contains('complete')||all.length<2||document.hidden||dragging||reduced.matches){stop();return}if(running)return;
  running=true;const choices=all.filter(p=>p!==lastStarter),first=choices[pick(choices.length)];lastStarter=first;
  const visited=new Set([first]);let source=first,hop=0;
  function relay(){
   const options=all.filter(p=>!visited.has(p)&&p.isConnected);if(!source.isConnected||!options.length){running=false;schedule();return}
   const origin=source.getBoundingClientRect();options.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot(ar.left-origin.left,ar.top-origin.top)-Math.hypot(br.left-origin.left,br.top-origin.top)});
   const target=options[pick(Math.min(3,options.length))],mood=moods[pick(moods.length)];
   emote(source,target,mood);later(()=>emote(target,source,mood==='laugh'?'laugh':mood==='cheeky'?'surprise':'cheeky'),480);
   visited.add(target);source=target;hop++;
   later(relay,1450+pick(400));
  }
  relay();
 }
 function gaze(){
  gazeFrame=0;if(board.classList.contains('complete'))return;
  const active=board.querySelector('.piece:not(.done)');if(!active)return;
  seated().forEach(p=>aim(p,active));
 }
 function requestGaze(){if(!gazeFrame)gazeFrame=requestAnimationFrame(gaze)}
 function groundShadows(){
  board.querySelectorAll('.piece').forEach(p=>{
   if(p.dataset.groundShadow)return;
   const art=p.querySelector('svg'),outline=art?.querySelector('.front-face')||art?.querySelector(':scope > path');if(!outline)return;
   const ns='http://www.w3.org/2000/svg',shadow=document.createElementNS(ns,'svg');shadow.setAttribute('viewBox',art.getAttribute('viewBox')||'0 0 100 100');shadow.setAttribute('class','ground-shadow');shadow.setAttribute('aria-hidden','true');
   const path=outline.cloneNode(false);path.removeAttribute('class');path.removeAttribute('id');path.style.setProperty('fill','#000','important');path.style.setProperty('stroke','none','important');path.style.setProperty('filter','none','important');shadow.appendChild(path);p.prepend(shadow);p.dataset.groundShadow='true';
  });
 }
 function sync(){
  groundShadows();
  const all=seated(),complete=board.classList.contains('complete');
  all.forEach((p,i)=>{if(!seatedBefore.has(p)){seatedBefore.add(p);p.dataset.seatPop='true';setTimeout(()=>{delete p.dataset.seatPop},460)}if(!p.dataset.peerSeed){p.dataset.peerSeed=String(i+1);p.style.setProperty('--peer-blink',(4+pick(35)/10)+'s');p.style.setProperty('--peer-delay',(-pick(40)/10)+'s')}
   const happiness=Math.min(1,all.length/10);p.style.setProperty('--peer-smile-x',(.64+happiness*.56).toFixed(2));p.style.setProperty('--peer-smile-y',(.22+happiness*.98).toFixed(2));p.style.setProperty('--peer-brow-y',(-happiness*5).toFixed(1)+'px');
  });
  if(!complete||all.length<2||document.hidden){stop();requestGaze();return}if(!running)schedule()
 }
 new MutationObserver(sync).observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 board.addEventListener('pointermove',requestGaze,{passive:true});
 board.addEventListener('pointerdown',e=>{if(e.target.closest('.piece:not(.done)')){dragging=true;stop()}},true);
 const release=()=>{if(dragging){dragging=false;schedule(1600)}};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else sync()});reduced.addEventListener('change',()=>{stop();sync()});
 window.PotatoInteractions={play:()=>{stop();conversation()},stop};sync();
})();
