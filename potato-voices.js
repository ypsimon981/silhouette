/* Short, local cartoon recordings. Add new clips to the groups to expand the set. */
(()=>{
 'use strict';
 const groups={success:['yes','yeah','yeah-baby','good-job'],error:['damn','holy-moly','dont-panic']};
 const ids=[...groups.success,...groups.error,'hurry-up'];
 const buffers=new Map(),last={};
 let ctx=null,loading=null,current=null,enabled=localStorage.getItem('10shapes_music')!=='off';
 function stop(){if(current){const source=current;current=null;try{source.stop();}catch(_){}}}
 function prepare(){
  if(loading)return loading;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return Promise.resolve();
  try{ctx=ctx||new AC();}catch(_){return Promise.resolve();}
  loading=Promise.all(ids.map(async id=>{
   try{
    const response=await fetch('./assets/voices/'+id+'.mp3?v=1');
    if(!response.ok)return;
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
    buffers.set(id,buffer);
   }catch(_){} // An unavailable clip must never delay play.
  }));
  return loading;
 }
 function unlock(){prepare();if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}
 function setEnabled(value){enabled=!!value;if(!enabled)stop();else unlock();}
 function play(kind,remainingMs=60000){
  if(!enabled||document.hidden||!ctx||ctx.state!=='running')return false;
  const probability=kind==='success'?1/3:kind==='error'?1/2:0;
  if(Math.random()>=probability)return false;
  const candidates=(groups[kind]||[]).slice();
  if(kind==='error'&&remainingMs<=15000)candidates.push('hurry-up');
  const available=candidates.filter(id=>buffers.has(id)&&id!==last[kind]);
  if(!available.length)return false;
  const id=available[Math.floor(Math.random()*available.length)];
  // A new event replaces the old reaction; never queue voices behind gameplay.
  stop();
  const source=ctx.createBufferSource(),gain=ctx.createGain();
  source.buffer=buffers.get(id);gain.gain.value=.2;
  source.connect(gain);gain.connect(ctx.destination);
  source.onended=()=>{source.disconnect();gain.disconnect();if(current===source)current=null;};
  current=source;last[kind]=id;
  window.PotatoSoundtrack?.duck(Math.ceil(source.buffer.duration*1000));
  source.start();return true;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 window.PotatoVoices={prepare,unlock,play,stop,setEnabled};
})();
