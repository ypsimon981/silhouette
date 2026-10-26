const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('results offer a banner once per finish; replay restores hand controls',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://potato.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=async()=>{throw Error('offline')};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 const source=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 try{
  w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
  w.eval(source.replace('})();','window.game={setLevel,updateToolbar,finish:won=>{elapsed=won?12000:60000;count=won?10:0;finishLevel(won)}};})();'));
  const events=[];w.addEventListener('timeshapes:ad-screen',e=>events.push(e.detail));
  const ad=w.document.querySelector('#adSlot'),app=w.document.querySelector('#app');
  w.game.setLevel(1);
  assert.equal(ad.style.display,'none');assert.ok(app.classList.contains('show-hand-controls'));
  for(const won of [true,false,true]){
   w.game.finish(won);
   assert.equal(ad.style.display,'flex');assert.ok(app.classList.contains('game-finished'));
   assert.equal(app.classList.contains('show-hand-controls'),false);
   assert.equal(events.at(-1).screen,'results:1');assert.equal(events.at(-1).eligible,true);
   const n=events.length;w.game.updateToolbar();assert.equal(events.length,n);
   w.document.querySelector('#again').click();
   assert.equal(ad.style.display,'none');assert.ok(app.classList.contains('show-hand-controls'));
   assert.equal(app.classList.contains('game-finished'),false);assert.equal(events.at(-1).eligible,false);
  }
  assert.equal(events.filter(e=>e.screen==='results:1').length,3);
  await new Promise(resolve=>setTimeout(resolve,50));
 }finally{w.close()}
});
