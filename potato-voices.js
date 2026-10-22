/* Short, local cartoon recordings. Add new clips to the groups to expand the set. */
(()=>{
 'use strict';
 const groups={success:['yes','yeah','yeah-baby','good-job'],error:['damn','holy-moly','dont-panic']};
 const fallback=[...groups.success,...groups.error,'hurry-up'].map(id=>({id,lang:'en',kind:id==='hurry-up'?'urgent':groups.success.includes(id)?'success':'error',src:'./assets/voices/'+id+'.mp3'}));
 const catalog=Array.isArray(window.PotatoVoiceCatalog)?window.PotatoVoiceCatalog:fallback;
 const buffers=new Map(),last={};
 let ctx=null,loading=null,current=null,enabled=localStorage.getItem('10shapes_music')!=='off';
 function stop(){if(current){const source=current;current=null;try{source.stop();}catch(_){}}}
 function prepare(){
  if(loading)return loading;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return Promise.resolve();
  try{ctx=ctx||new AC();}catch(_){return Promise.resolve();}
  // Load a small selection across languages first, with at most four requests.
  const pending=catalog.slice().sort((a,b)=>{
   const order={success:0,error:1,urgent:2};
   return (order[a.kind]-order[b.kind])||a.phrase?.localeCompare(b.phrase||'')||0;
  });
  async function worker(){
   while(pending.length){
    const clip=pending.shift();
    try{
     const response=await fetch(clip.src+'?v=1');
     if(!response.ok)continue;
     const buffer=await ctx.decodeAudioData(await response.arrayBuffer());
     buffers.set(clip.id,buffer);
    }catch(_){} // An unavailable clip must never delay play.
   }
  }
  loading=Promise.all(Array.from({length:4},worker));
  return loading;
 }
 function unlock(){prepare();if(ctx?.state==='suspended')ctx.resume().catch(()=>{});}
 function setEnabled(value){enabled=!!value;if(!enabled)stop();else unlock();}
 function play(kind,remainingMs=60000){
  if(!enabled||document.hidden||!ctx||ctx.state!=='running')return false;
  const probability=kind==='success'?1/3:kind==='error'?1/2:0;
  if(Math.random()>=probability)return false;
  const available=catalog.filter(clip=>(clip.kind===kind||(kind==='error'&&remainingMs<=15000&&clip.kind==='urgent'))&&buffers.has(clip.id)&&clip.id!==last[kind]);
  if(!available.length)return false;
  // Choose a language first so each language has the same chance.
  const languages=[...new Set(available.map(clip=>clip.lang))];
  const lang=languages[Math.floor(Math.random()*languages.length)];
  const choices=available.filter(clip=>clip.lang===lang);
  const id=choices[Math.floor(Math.random()*choices.length)].id;
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
