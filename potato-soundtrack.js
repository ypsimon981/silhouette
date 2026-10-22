/* 10Potatoes music engine. Self-contained synthesized fallback; replaces missing WAV requests. */
(()=>{
"use strict";
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,timer=null,enabled=localStorage.getItem("10shapes_music")!=="off";
let mode="home",step=0,nextTime=0,tempo=1,level=1,duckUntil=0;
const beat=60/118;
const menuMotifs=[[60,67,64,69],[60,67,65,69],[59,67,64,71],[60,69,67,72],[60,67,64,69,72,69],[57,65,69,67,64],[62,69,65,72],[60,67,64,72]];
const bassRoots=[36,36,41,36,33,38,36,43,36,41,33,38,36,43,41,36];
const midi=n=>440*Math.pow(2,(n-69)/12);
function init(){
 if(!AC)return false;
 if(!ctx){ctx=new AC();master=ctx.createGain();master.gain.value=.65;master.connect(ctx.destination);}
 if(ctx.state==="suspended")ctx.resume().catch(()=>{});
 return true;
}
function pluck(note,when,duration,volume,type){
 if(!ctx||!master)return;
 const fundamental=midi(note),partials=type==="bass"?[1,.37,.14]:[1,.28,.12];
 const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,when);
 gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.009);
 gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
 gain.connect(master);
 partials.forEach((p,i)=>{
  const osc=ctx.createOscillator();osc.type="sine";osc.frequency.setValueAtTime(fundamental*(i+1),when);
  const g=ctx.createGain();g.gain.value=p;osc.connect(g);g.connect(gain);
  osc.start(when);osc.stop(when+duration+.025);
 });
}
function emit(n,t){
 const bar=Math.floor(n/8),sub=n%8,slot=sub/2;
 if(mode==="home"){
  const motif=menuMotifs[bar%menuMotifs.length];
  if(sub===0||sub===2||sub===4||sub===6){
   const index=Math.floor(sub/2);
   pluck(motif[index%motif.length],t,.24,.13,"marimba");
   pluck(bassRoots[bar%bassRoots.length]+(index%2?7:0)-12,t,.34,.105,"bass");
  }
  if(sub===7&&bar%4===3)pluck(72,t,.12,.045,"marimba");
 }else{
  const root=bassRoots[(bar+Math.floor(level/3))%bassRoots.length];
  const pattern=[0,7,12,7,0,7,10,7];
  const accent=sub%2===0?.21:.13;
  if(sub!==6||bar%4!==2)pluck(root+pattern[sub],t,sub%2===0?.32:.19,accent,"bass");
  if(sub===7&&bar%4===3)pluck(root+12,t,.12,.10,"bass");
 }
}
function schedule(){
 if(!ctx||!enabled||document.hidden)return;
 const now=ctx.currentTime;
 if(nextTime<now-.5)nextTime=now+.04;
 let count=0;
 while(nextTime<now+.17&&count++<12){
  emit(step,nextTime);
  step++;
  const multiplier=mode==="home"?1:tempo;
  nextTime+=beat/(2*multiplier);
 }
}
function stopScheduler(){if(timer!==null){clearInterval(timer);timer=null;}}
function sync(){
 if(!enabled||document.hidden||mode!=="game"){stopScheduler();if(master&&ctx)master.gain.setTargetAtTime(.0001,ctx.currentTime,.025);return;}
 if(!init())return;
 master.gain.setTargetAtTime(mode==="home"?.025:(Date.now()<duckUntil?.29:.53),ctx.currentTime,.07);
 if(timer===null){nextTime=ctx.currentTime+.06;timer=setInterval(schedule,45);schedule();}
}
function setMode(m){const newMode=m==="game"?"game":"home";if(mode!==newMode){mode=newMode;step=0;if(ctx)nextTime=ctx.currentTime+.07;}sync();}
function setEnabled(v){enabled=!!v;sync();}
function startGame(l){level=Math.max(1,Number(l)||1);tempo=level<=3?1:level<=6?1.06:1.12;setMode("game");}
function setProgress(f,l){
 if(mode!=="game")return;
 level=Math.max(1,Number(l)||level);
 const progress=Math.max(0,Math.min(1,Number(f)||0));
 const base=level<=3?1:level<=6?1.06:1.12;
 const target=Math.min(1.56,base*(1+.38*Math.pow(progress,1.6)));
 tempo+=(target-tempo)*.1;
}
function finish(){setMode("home");}
function duck(duration=850){const hold=Math.max(850,Math.min(3000,Number(duration)||850));duckUntil=Date.now()+hold;if(master&&ctx){master.gain.setTargetAtTime(.26,ctx.currentTime,.025);setTimeout(()=>{if(mode==="game")sync()},hold);}}
document.addEventListener("visibilitychange",sync);
window.addEventListener("pointerdown",()=>{if(enabled&&mode==="game")sync()},{passive:true});
window.PotatoSoundtrack={setMode,setEnabled,startGame,setProgress,finish,duck};
})();
