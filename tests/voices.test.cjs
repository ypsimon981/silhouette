const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('recorded voice groups, no immediate repeats, no overlapping audio, mute and visibility',async()=>{
 const sources=[],listeners={},duck=[],gains=[];
 let roll=0;
 class Context{
  state='running';destination={};
  async decodeAudioData(data){return {duration:1,id:data.id};}
  createGain(){const g={gain:{value:1},connect(){},disconnect(){}};gains.push(g);return g;}
  createBufferSource(){const s={connect(){},disconnect(){},start(){s.started=true;},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;}
 }
 const window={AudioContext:Context,PotatoSoundtrack:{duck:ms=>duck.push(ms)}};
 const document={hidden:false,addEventListener:(event,fn)=>listeners[event]=fn};
 vm.runInNewContext(fs.readFileSync('potato-voice-catalog.js','utf8'),{window});
 let requests=0,peak=0,inflight=0;
 vm.runInNewContext(fs.readFileSync('potato-voices.js','utf8'),{Math:Object.assign(Object.create(Math),{random:()=>roll}),window,document,localStorage:{getItem:()=>null},fetch:async url=>{requests++;peak=Math.max(peak,++inflight);await Promise.resolve();inflight--;assert.ok(fs.existsSync(url.split('?')[0]));return {ok:true,arrayBuffer:async()=>({id:url.split('?')[0]})};}});
 const v=window.PotatoVoices;await v.prepare();
 assert.equal(requests,100);assert.ok(peak<=4);
 const category=()=>window.PotatoVoiceCatalog.find(c=>c.src===sources.at(-1).buffer.id).kind;
 assert.equal(v.play('success'),true);const first=sources.at(-1).buffer;
 assert.equal(category(),'success');
 assert.equal(gains.at(-1).gain.value,.2);
 const playing=sources.at(-1),silentCount=sources.length,duckCount=duck.length;
 roll=1/3;assert.equal(v.play('success'),false);
 assert.equal(sources.length,silentCount);assert.equal(playing.stopped,undefined);assert.equal(duck.length,duckCount);
 roll=1/3-Number.EPSILON;assert.equal(v.play('success'),true);
 const lastSuccess=sources.at(-1).buffer;assert.notEqual(lastSuccess,first);
 roll=.5;assert.equal(v.play('error'),false);
 roll=.5-Number.EPSILON;assert.equal(v.play('error'),true);assert.equal(category(),'error');
 roll=0;
 v.play('success');assert.notEqual(sources.at(-1).buffer,lastSuccess);assert.ok(sources[0].stopped);
 v.play('error');assert.ok(sources[1].stopped);assert.equal(duck.at(-1),1000);
 const before=sources.length;v.setEnabled(false);assert.ok(sources.at(-1).stopped);assert.equal(v.play('success'),false);assert.equal(sources.length,before);
 v.setEnabled(true);v.play('error',10000);document.hidden=true;listeners.visibilitychange();assert.ok(sources.at(-1).stopped);assert.equal(v.play('success'),false);
});

test('catalog has ten languages, ten distinct recordings each, positive/error/urgent separation and local files',()=>{
 const window={};vm.runInNewContext(fs.readFileSync('potato-voice-catalog.js','utf8'),{window});
 const catalog=window.PotatoVoiceCatalog,languages=new Set(catalog.map(c=>c.lang));
 assert.equal(catalog.length,100);assert.equal(languages.size,10);assert.equal(new Set(catalog.map(c=>c.src)).size,100);
 for(const lang of languages){
  const clips=catalog.filter(c=>c.lang===lang);assert.equal(clips.length,10);
  assert.equal(clips.filter(c=>c.kind==='success').length,6);assert.equal(clips.filter(c=>c.kind==='error').length,3);assert.equal(clips.filter(c=>c.kind==='urgent').length,1);
 }
 for(const c of catalog){assert.ok(c.text.trim());assert.ok(fs.statSync(c.src).size>1000);}
});

test('separate music and voice toggles act independently, persist and migrate previous settings',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 function fixture(saved,legacy='on',voicePreference=null){
  const dom=new JSDOM(html,{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,state={};
  w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music',legacy);
  if(saved!==null)w.localStorage.setItem('10potatoes_audio_mode',saved);
  if(voicePreference!==null)w.localStorage.setItem('10potatoes_voices',voicePreference);
  w.fetch=async()=>{throw Error('offline fixture');};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.PotatoVoices={prepare(){},stop(){},setEnabled:v=>state.voice=v};
  w.PotatoSoundtrack={setEnabled:v=>state.music=v,setMode(){},finish(){},startGame(){state.starts=(state.starts||0)+1;}};
  w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
  const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace('})();','window.audioTest={play:()=>{phase="playing";},setup,goHome};})();');
  w.eval(script);return {w,state,music:w.document.getElementById('soundToggle'),voice:w.document.getElementById('voiceToggle')};
 }
 const fixtures=[];
 try{
  const f=fixture(null);fixtures.push(f);f.w.audioTest.play();
  assert.deepEqual([f.state.music,f.state.voice],[true,true]);
  assert.equal(f.w.document.querySelectorAll('#audioControls button').length,2);
  for(const [button,music,voice] of [[f.music,false,true],[f.voice,false,false],[f.music,true,false],[f.voice,true,true]]){
   const starts=f.state.starts||0;button.click();
   assert.deepEqual([f.state.music,f.state.voice],[music,voice]);
   if(button===f.voice)assert.equal(f.state.starts||0,starts,'voice toggle must not restart music');
   assert.equal(f.music.getAttribute('aria-pressed'),String(music));assert.equal(f.voice.getAttribute('aria-pressed'),String(voice));
   assert.equal(f.music.querySelector('.audioCaption').textContent,'MUSICA');assert.equal(f.voice.querySelector('.audioCaption').textContent,'VOCI');
   assert.equal(f.music.querySelector('.audioState').textContent,music?'ON':'OFF');assert.equal(f.voice.querySelector('.audioState').textContent,voice?'ON':'OFF');
   assert.equal(f.w.localStorage.getItem('10shapes_music'),music?'on':'off');assert.equal(f.w.localStorage.getItem('10potatoes_voices'),voice?'on':'off');
   f.w.audioTest.setup();f.w.audioTest.goHome();assert.deepEqual([f.state.music,f.state.voice],[music,voice]);f.w.audioTest.play();
  }
  for(const [saved,legacy,pref,music,voice] of [['all','on',null,true,true],['off','off',null,false,false],['voice','off',null,false,true],['music','on',null,true,false],[null,'off',null,false,false],['invalid','off',null,false,false],['off','on','on',true,true],['all','off','on',false,true],['all','on','off',true,false],['all','off','off',false,false]]){
   const f=fixture(saved,legacy,pref);fixtures.push(f);assert.deepEqual([f.state.music,f.state.voice],[music,voice]);
  }
 }finally{await new Promise(resolve=>setTimeout(resolve,30));fixtures.forEach(f=>f.w.close());}
});

test('real release handler routes correct/wrong placements, cancellation, tenth potato and exit',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[];
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=async()=>{throw Error('offline fixture');};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.PotatoVoices={prepare(){},unlock(){},stop(){calls.push(['stop']);},play(...args){calls.push(args);},setEnabled(){}};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const debug=`window.voiceTest={arm:(correct,n=0,ms=1000)=>{setLevel(1);phase='playing';start=performance.now()-ms;count=n;beginSectors();next();offset={x:0,y:0};active.getBoundingClientRect=()=>({left:correct?0:200,top:0,width:100,height:100});slots[count].getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});},release:type=>up({type}),goHome,setup,state:()=>({count,phase,left:active?.style.left})};})();`;
 w.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace('})();',debug));
 try{
  const g=w.voiceTest;
  g.arm(true);calls.length=0;g.release('pointerup');assert.equal(calls[0][0],'success');assert.equal(g.state().count,1);
  g.arm(false,0,50000);calls.length=0;g.release('pointerup');assert.equal(calls[0][0],'error');assert.ok(calls[0][1]<=10000);assert.equal(g.state().left,'50%');
  g.arm(true);calls.length=0;g.release('pointercancel');assert.equal(calls.length,0);assert.equal(g.state().count,0);
  g.arm(true,9);calls.length=0;g.release('pointerup');assert.equal(calls[0][0],'success');assert.equal(calls.some(c=>c[0]==='stop'),false);
  g.goHome();assert.equal(calls.at(-1)[0],'stop');
  g.arm(false);calls.length=0;g.release('pointerup');g.setup();assert.equal(calls.at(-1)[0],'stop');
 }finally{await new Promise(resolve=>setTimeout(resolve,30));w.close();}
});
