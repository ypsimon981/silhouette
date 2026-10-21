const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function fixture(){
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');w.fetch=()=>new Promise(()=>{});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const debug='window.behaviorTest={setLevel,setup,goHome,summary:behaviorSummary,store:behaviorStore,play:(n,ms=1000)=>{phase="playing";start=performance.now()-ms;count=n;beginBehaviorAttempt();},finish:ms=>{elapsed=ms;count=10;finishLevel(true);},analysis:()=>{statsMode=mode;showProgress()},player:()=>playerId,other:()=>{playerId="other-player"}};})();';
 w.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace('})();',debug));
 return {w,g:w.behaviorTest,close:()=>w.close()};
}
test('only started games count; restart/exit boundaries and duplicate actions are recorded correctly',()=>{
 const {w,g,close}=fixture();try{
  g.setLevel(1);w.document.querySelector('#restart').click();assert.equal(g.summary(1).data.length,0);
  w.document.querySelector('#startButton').click();w.document.querySelector('#restart').click();assert.equal(g.summary(1).data.length,0);
  for(const n of [0,1,2,4,5,9]){g.play(n);w.document.querySelector('#restart').click();}
  assert.deepEqual(Array.from(g.summary(1).interrupted,a=>a.sector),[1,1,2,2,3,3]);
  g.play(5);g.goHome();g.goHome();assert.equal(g.summary(1).data.length,7);assert.equal(g.summary(1).data.at(-1).reason,'exit');
  // Switching level must retain the identity of the interrupted level.
  g.setLevel(1);g.play(2);g.setLevel(2);assert.equal(g.summary(1).data.at(-1).sector,2);assert.equal(g.summary(2).data.length,0);
  g.play(4);g.setup();assert.equal(g.summary(2).data[0].level,2);
 }finally{close()}
});
test('completion, excluded long attempts, rounded distribution, UI and behavior coach use observed data',()=>{
 const {w,g,close}=fixture();try{
  g.setLevel(1);for(const n of [0,2,5]){g.play(n);g.setup()}
  g.play(10,8000);g.finish(8000);g.setup();
  g.play(0);g.setup();
  const s=g.summary(1);assert.equal(s.completed.length,1);assert.equal(s.restarts.length,4);assert.equal(s.longest,3);
  assert.equal(s.shares.reduce((a,b)=>a+b,0),100);
  g.analysis();const panel=w.document.querySelector('#behaviorAnalysis');
  assert.match(panel.textContent,/20% completate · 80% ricominciate/);
  assert.match(panel.querySelector('[role="img"]').getAttribute('aria-label'),/S1: 50% \(2\)/);
  assert.match(panel.textContent,/Serie più lunga: 3/);
  g.setLevel(1);g.play(2,61000);g.setup();assert.equal(g.summary(1).data.length,5);
  g.play(2,60001);g.finish(60001);assert.equal(g.summary(1).data.length,5);
  // Over-limit and legacy timing history never manufactures interruption events.
  w.localStorage.setItem('10shapes_attempt_history_v2',JSON.stringify([{level:1,ms:10000,won:true}]));
  assert.equal(g.summary(1).data.length,5);
  g.other();assert.equal(g.summary(1).data.length,0);
 }finally{close()}
});
test('distribution totals 100%, history retains 100 per level and storage failures do not block reset',()=>{
 const {w,g,close}=fixture();try{
  g.setLevel(1);for(const n of [0,2,5]){g.play(n);g.setup()}
  assert.deepEqual(Array.from(g.summary(1).shares),[34,33,33]);
  for(let i=0;i<100;i++){g.play(i%10);g.setup()}
  assert.equal(g.summary(1).data.length,100);
  const descriptor=Object.getOwnPropertyDescriptor(w.Storage.prototype,'setItem');
  w.Storage.prototype.setItem=function(key,value){if(key==='10shapes_behavior_v1')throw Error('quota');return descriptor.value.call(this,key,value)};
  g.play(0);assert.doesNotThrow(()=>g.setup());assert.equal(w.document.querySelector('#startButton').style.display,'block');
 }finally{close()}
});
