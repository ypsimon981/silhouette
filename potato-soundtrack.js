/* 10Potatoes soundtrack: user-approved recordings. */
(function(){
  const tracks={menu:new Audio("./audio/10Potatoes_con_contrabbasso.wav"),game:new Audio("./audio/10Potatoes_solo_contrabbasso_buffo.wav")};
  for(const t of Object.values(tracks)){t.loop=true;t.preload="auto";t.playsInline=true;}
  tracks.menu.volume=.18;tracks.game.volume=.32;
  let enabled=localStorage.getItem("10shapes_music")!=="off",mode="home",lastRate=1,duckTimer=0;
  function pause(t){if(!t.paused)t.pause();}
  function play(t){const p=t.play();if(p&&p.catch)p.catch(()=>{});}
  function sync(){
    if(!enabled){pause(tracks.menu);pause(tracks.game);return;}
    if(mode==="game"){pause(tracks.menu);play(tracks.game);}
    else{pause(tracks.game);tracks.game.playbackRate=1;play(tracks.menu);}
  }
  function setMode(next){if(mode===next){sync();return;}mode=next;sync();}
  function setEnabled(v){enabled=!!v;sync();}
  function setProgress(fraction,level){
    if(mode!=="game")return;
    const p=Math.max(0,Math.min(1,Number(fraction)||0));
    const difficulty=Number(level)<=3?1:Number(level)<=6?1.06:1.12;
    const target=Math.min(1.56,difficulty*(1+.38*Math.pow(p,1.6)));
    lastRate+=(target-lastRate)*.08;
    tracks.game.playbackRate=lastRate;
  }
  function startGame(level){lastRate=Number(level)<=3?1:Number(level)<=6?1.06:1.12;tracks.game.playbackRate=lastRate;tracks.game.currentTime=0;setMode("game");}
  function finish(){setMode("home");}
  function duck(){if(mode!=="game")return;tracks.game.volume=.16;clearTimeout(duckTimer);duckTimer=setTimeout(()=>{tracks.game.volume=.32},850);}
  document.addEventListener("visibilitychange",()=>{if(document.hidden){pause(tracks.menu);pause(tracks.game)}else sync()});
  window.addEventListener("pointerdown",()=>{if(enabled)sync()},{passive:true});
  window.PotatoSoundtrack={setMode,setEnabled,setProgress,startGame,finish,duck};
})();