/* Cosmetic conversations between seated potatoes. No score, audio or game RNG access. */
(()=>{
 const board=document.getElementById('board');if(!board)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pick=n=>{const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n};
 const seated=()=>board.classList.contains('game-screen')?[...board.querySelectorAll('.piece.done')]:[];
 const seatedBefore=new WeakSet();
 let liveTimers=new Set(),napTimer=0,sleeper=null,napUsed=false,lastCount=0,wasOops=false,errorCooldown=0;
 let prankTimers=new Set(),prankArmed=false,prankRunning=false;
 let timers=new Set(),loop=0,running=false,dragging=false,lastStarter=null,gazeFrame=0;
 const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
 const moods=['cheeky','laugh','surprise','curious','cheeky','laugh','tongue','raspberry'];
 function reset(p){delete p.dataset.peerMood;delete p.dataset.peerBusy;p.style.removeProperty('--peer-x');p.style.removeProperty('--peer-y')}
 function stop(){clearTimeout(loop);timers.forEach(clearTimeout);timers.clear();running=false;board.querySelectorAll('[data-peer-busy]').forEach(reset)}
 function aim(a,b){const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(),dx=br.left-ar.left,dy=br.top-ar.top,len=Math.hypot(dx,dy)||1;a.style.setProperty('--peer-x',(dx/len*12).toFixed(1)+'px');a.style.setProperty('--peer-y',(dy/len*8).toFixed(1)+'px')}
 function emote(a,b,mood){if(!a.isConnected||!b.isConnected)return;a.dataset.peerBusy='true';aim(a,b);a.dataset.peerMood=mood;later(()=>reset(a),1250)}
 function schedule(ms=2600+pick(2500)){clearTimeout(loop);if(!prankRunning&&board.classList.contains('complete')&&seated().length>1&&!document.hidden&&!reduced.matches&&!dragging)loop=setTimeout(conversation,ms)}
 function conversation(){
  if(prankRunning)return;
  const all=seated();if(!board.classList.contains('complete')||all.length<2||document.hidden||dragging||reduced.matches){stop();return}if(running)return;
  running=true;const choices=all.filter(p=>p!==lastStarter),first=choices[pick(choices.length)];lastStarter=first;
  const visited=new Set([first]);let source=first,hop=0;
  function relay(){
   const options=all.filter(p=>!visited.has(p)&&p.isConnected);if(!source.isConnected||!options.length){running=false;schedule();return}
   const origin=source.getBoundingClientRect();options.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.hypot(ar.left-origin.left,ar.top-origin.top)-Math.hypot(br.left-origin.left,br.top-origin.top)});
   const target=options[pick(Math.min(3,options.length))],mood=moods[pick(moods.length)];
   emote(source,target,mood);later(()=>emote(target,source,mood==='laugh'?'surprise':mood==='cheeky'?'surprise':'laugh'),480);
   visited.add(target);source=target;hop++;
   later(relay,1450+pick(400));
  }
  relay();
 }
 function gaze(){
  gazeFrame=0;if(board.classList.contains('complete'))return;
  const active=board.querySelector('.piece:not(.done)');if(!active)return;
  seated().forEach(p=>{if(!p.dataset.egg&&!p.dataset.peerBusy)aim(p,active)});
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

 const live=()=>board.classList.contains('board-live')&&!board.classList.contains('complete')&&!document.hidden;
 const liveLater=(fn,ms)=>{const id=setTimeout(()=>{liveTimers.delete(id);fn()},ms);liveTimers.add(id);return id};
 function clearEgg(p){delete p.dataset.egg;reset(p)}
 function clearLive(){clearTimeout(napTimer);napTimer=0;liveTimers.forEach(clearTimeout);liveTimers.clear();board.querySelectorAll('[data-egg]').forEach(clearEgg);board.removeAttribute('data-last-piece');sleeper=null}
 function wake(animate=true){
  if(!sleeper)return;const p=sleeper;sleeper=null;delete p.dataset.egg;
  if(animate&&p.isConnected&&live()){p.dataset.egg='wake';liveLater(()=>{clearEgg(p);requestGaze()},420)}
 }
 function planNap(){
  if(napTimer||napUsed||!live()||seated().length<2||seated().length>=8||reduced.matches)return;
  napTimer=setTimeout(()=>{
   napTimer=0;if(!live()||dragging||seated().length>=8)return;
   if(pick(3)!==0){planNap();return}
   const choices=seated().filter(p=>!p.dataset.egg);if(!choices.length)return;
   sleeper=choices[pick(choices.length)];sleeper.dataset.egg='sleep';napUsed=true;
   liveLater(()=>wake(),3800);
  },1800+pick(2200));
 }
 function complicitGlance(){
  const all=seated();if(!live()||dragging||reduced.matches||all.length<2||performance.now()<errorCooldown||all.length===9)return;
  errorCooldown=performance.now()+5000;wake(false);
  const a=all[pick(all.length)],ar=a.getBoundingClientRect();
  const others=all.filter(p=>p!==a).sort((p,q)=>{const pr=p.getBoundingClientRect(),qr=q.getBoundingClientRect();return Math.hypot(pr.left-ar.left,pr.top-ar.top)-Math.hypot(qr.left-ar.left,qr.top-ar.top)});
  const b=others[0];
  function glance(p,friend){if(!live()||dragging||!p.isConnected||!friend.isConnected)return;p.dataset.egg='complicit';p.dataset.peerBusy='true';aim(p,friend)}
  glance(a,b);liveLater(()=>glance(b,a),180);
  liveLater(()=>{[a,b].forEach(clearEgg);requestGaze()},1050);
 }


 const mouthShapes={
  strain:'M220 300 Q250 315 282 300 L282 309 Q250 324 220 309Z',
  hold:'M224 305 Q250 300 278 305 L278 313 Q250 309 224 313Z',
  whistle:'M263 294 C282 294 282 317 263 317 C245 317 245 294 263 294Z',
  neutral:'M215 300 Q250 297 285 300 L285 307 Q250 304 215 307Z',
  smallSmile:'M214 295 Q250 313 286 295 Q281 324 250 326 Q220 324 214 295Z',
  smile:'M212 294 C218 286 226 302 248 302 C270 302 280 285 288 284 C302 282 290 322 263 329 C237 336 209 317 208 301 Q208 296 212 294Z',
  cheeky:'M212 303 Q244 312 286 288 Q291 311 267 322 Q234 333 212 303Z',
  surprise:'M250 283 C277 283 277 329 250 329 C223 329 223 283 250 283Z',
  sleep:'M247 300 C257 300 259 314 250 317 C239 317 236 301 247 300Z',
  tongue:'M211 290 Q250 307 289 290 Q293 335 251 340 Q211 336 211 290Z',
  raspberry:'M250 292 C275 288 278 321 253 326 C228 330 222 297 250 292Z',
  laugh:'M209 288 Q250 312 292 285 Q293 337 251 341 Q210 338 209 288Z'
 };

 function facialParts(p,mood){
  const eyes=p.querySelector('.potatoEyes'),brows=p.querySelector('.potatoBrows');if(!eyes||!brows)return;
  let pupil=eyes.querySelector('.potatoPupils');if(!pupil){pupil=eyes.querySelector('g');if(pupil)pupil.classList.add('potatoPupils')}
  const wrap=node=>{if(node.parentNode.classList.contains('reaction-pose'))return node.parentNode;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','reaction-pose');node.replaceWith(g);g.append(node);return g};
  const eyePose=wrap(eyes),browPose=wrap(brows);
  const sy=mood==='strain'?.36:mood==='hold'?1.23:mood==='whistle'?.9:mood==='sleep'?.07:mood==='surprise'?1.18:mood==='cheeky'?.67:mood==='laugh'?.65:mood==='tongue'?.82:mood==='raspberry'?.75:1;
  eyePose.setAttribute('transform','translate(250 210) scale(1 '+sy+') translate(-250 -210)');
  browPose.setAttribute('transform',mood==='strain'?'rotate(9 250 115)':mood==='hold'?'translate(0 -20)':mood==='whistle'?'rotate(-7 250 115)':mood==='sleep'?'translate(0 9)':mood==='surprise'?'translate(0 -18)':mood==='cheeky'?'rotate(-10 250 115) translate(0 -6)':'translate(0 0)');
 }

 function expression(p,count,complete){
  const egg=p.dataset.egg,mood=p.dataset.peerMood;
  const prank=p.dataset.prank;
  const key=prank==='blush'?'strain':prank==='gasp'?'surprise':prank==='hold'?'hold':prank==='laugh'?'laugh':prank==='whistle'?'whistle':egg==='sleep'?'sleep':egg==='wake'?'surprise':egg==='complicit'?'cheeky':mood==='surprise'?'surprise':mood==='tongue'?'tongue':mood==='raspberry'?'raspberry':mood==='laugh'?'laugh':mood==='cheeky'?'cheeky':mood==='curious'?'smallSmile':complete||count>=7?'smile':count>=4?'smallSmile':'neutral';
  facialParts(p,key);
  if(p.dataset.faceExpression===key)return;
  const mouth=p.querySelector('.potatoMouth'),path=mouth?.querySelector('path');if(!path)return;
  path.setAttribute('d',mouthShapes[key]);const rim=mouth.querySelectorAll('path')[1];if(rim)rim.style.opacity=key==='smile'?'.75':'0';

  let tongue=mouth.querySelector('.potatoTongue');
  if(!tongue&&(key==='tongue'||key==='raspberry')){
   const ns='http://www.w3.org/2000/svg';tongue=document.createElementNS(ns,'g');tongue.setAttribute('class','potatoTongue');
   const skin=document.createElementNS(ns,'path');skin.setAttribute('d','M233 315 Q250 309 268 315 L268 333 Q266 350 251 352 Q234 350 233 333Z');skin.style.setProperty('fill','#e97983','important');skin.style.setProperty('stroke','#a73549','important');skin.style.strokeWidth='2';
   const crease=document.createElementNS(ns,'path');crease.setAttribute('d','M251 317 L251 336');crease.style.setProperty('fill','none','important');crease.style.setProperty('stroke','#b74156','important');crease.style.strokeWidth='2.2';crease.style.strokeLinecap='round';
   tongue.append(skin,crease);mouth.appendChild(tongue);
  }
  if(tongue){tongue.style.display=(key==='tongue'||key==='raspberry')?'inline':'none';tongue.setAttribute('transform',key==='raspberry'?'translate(15 53) scale(.94 .84)':'translate(0 0)')}
  p.dataset.faceExpression=key;
 }


 const prankLater=(fn,ms)=>{const id=setTimeout(()=>{prankTimers.delete(id);fn()},ms);prankTimers.add(id);return id};
 function clearPrank(resetArm=false){
  prankTimers.forEach(clearTimeout);prankTimers.clear();prankRunning=false;
  board.removeAttribute('data-prank-active');
  board.querySelectorAll('[data-prank]').forEach(p=>{delete p.dataset.prank;reset(p)});
  if(resetArm)prankArmed=false;
 }
 function prank(){
  if(!board.classList.contains('complete')||document.hidden||reduced.matches)return;
  const all=seated();if(all.length<3)return;stop();prankRunning=true;board.dataset.prankActive='true';
  const panels=[...board.querySelectorAll('#finishScore,#finishCommands')].map(p=>p.getBoundingClientRect());
  const visible=all.filter(p=>{const a=p.getBoundingClientRect(),area=a.width*a.height||1;return panels.reduce((n,b)=>n+Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)),0)/area<.25});
  const pool=visible.length?visible:all,actor=pool[pick(pool.length)],ar=actor.getBoundingClientRect();
  const nearest=all.filter(p=>p!==actor).sort((p,q)=>{const a=p.getBoundingClientRect(),b=q.getBoundingClientRect();return Math.hypot(a.left-ar.left,a.top-ar.top)-Math.hypot(b.left-ar.left,b.top-ar.top)}).slice(0,2);
  actor.dataset.prank='blush';nearest.forEach(p=>aim(p,actor));
  prankLater(()=>{window.PotatoVoices?.playEffect?.('fart');nearest.forEach(p=>{p.dataset.prank='gasp';aim(p,actor)})},850);
  prankLater(()=>{nearest.forEach(p=>p.dataset.prank='hold');all.filter(p=>p!==actor&&!nearest.includes(p)).forEach(p=>{p.dataset.prank='laugh';aim(p,actor)})},1450);
  prankLater(()=>{actor.dataset.prank='whistle';actor.style.setProperty('--peer-x','-10px');actor.style.setProperty('--peer-y','-15px');window.PotatoVoices?.playEffect?.('whistle')},2150);
  prankLater(()=>{clearPrank();schedule(1800)},6500);
 }

 function sync(){
  groundShadows();
  const all=seated(),complete=board.classList.contains('complete');
  all.forEach((p,i)=>{if(!seatedBefore.has(p)){seatedBefore.add(p);p.dataset.seatPop='true';setTimeout(()=>{delete p.dataset.seatPop},460)}if(!p.dataset.peerSeed){p.dataset.peerSeed=String(i+1);p.style.setProperty('--peer-blink',(4+pick(35)/10)+'s');p.style.setProperty('--peer-delay',(-pick(40)/10)+'s')}
   const happiness=Math.min(1,all.length/10);p.style.setProperty('--peer-smile-x',(.64+happiness*.56).toFixed(2));p.style.setProperty('--peer-smile-y',(.22+happiness*.98).toFixed(2));p.style.setProperty('--peer-brow-y',(-happiness*5).toFixed(1)+'px');
  });
  const isLive=live(),oops=board.classList.contains('potato-oops');
  if(all.length<lastCount){clearLive();napUsed=false;errorCooldown=0}
  if(isLive){
   if(all.length>lastCount)wake();
   if(all.length===9){wake(false);board.dataset.lastPiece='true';clearTimeout(napTimer);napTimer=0}
   else board.removeAttribute('data-last-piece');
   if(oops&&!wasOops)complicitGlance();
   planNap();
  }else clearLive();
  if(!complete||document.hidden){if(prankArmed||prankRunning)clearPrank(true)}
  else if(all.length>=3&&!prankArmed&&!reduced.matches){prankArmed=true;prankLater(prank,2800)}
  all.forEach(p=>expression(p,all.length,complete));
  lastCount=all.length;wasOops=oops;
  if(!complete||all.length<2||document.hidden){clearTimeout(loop);running=false;requestGaze();return}if(!running&&!prankRunning)schedule()
 }
 new MutationObserver(sync).observe(board,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-egg','data-peer-mood','data-prank','data-prank-active']});
 board.addEventListener('pointermove',requestGaze,{passive:true});
 board.addEventListener('pointerdown',e=>{if(e.target.closest('.piece:not(.done)')){dragging=true;stop()}},true);
 const release=()=>{if(dragging){dragging=false;schedule(1600)}};window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();clearLive();clearPrank(true)}else sync()});reduced.addEventListener('change',()=>{stop();clearLive();clearPrank(true);sync()});
 window.PotatoInteractions={prank:()=>{clearPrank();prankArmed=true;prank()},play:()=>{stop();conversation()},stop};sync();
})();
