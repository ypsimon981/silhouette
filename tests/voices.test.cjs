const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('recorded voice groups, no immediate repeats, no overlapping audio, mute and visibility',async()=>{
 const sources=[],listeners={},duck=[];
 class Context{
  state='running';destination={};
  async decodeAudioData(){return {duration:1};}
  createGain(){return {gain:{value:1},connect(){},disconnect(){}};}
  createBufferSource(){const s={connect(){},disconnect(){},start(){s.started=true;},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;}
 }
 const window={AudioContext:Context,PotatoSoundtrack:{duck:ms=>duck.push(ms)}};
 const document={hidden:false,addEventListener:(event,fn)=>listeners[event]=fn};
 vm.runInNewContext(fs.readFileSync('potato-voices.js','utf8'),{window,document,localStorage:{getItem:()=>null},fetch:async url=>{assert.ok(fs.existsSync(url.split('?')[0]));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}});
 const v=window.PotatoVoices;await v.prepare();
 assert.equal(v.play('success'),true);const first=sources.at(-1).buffer;
 v.play('success');assert.notEqual(sources.at(-1).buffer,first);assert.ok(sources[0].stopped);
 v.play('error');assert.ok(sources[1].stopped);assert.equal(duck.at(-1),1000);
 const before=sources.length;v.setEnabled(false);assert.ok(sources.at(-1).stopped);assert.equal(v.play('success'),false);assert.equal(sources.length,before);
 v.setEnabled(true);v.play('error',10000);document.hidden=true;listeners.visibilitychange();assert.ok(sources.at(-1).stopped);assert.equal(v.play('success'),false);
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
