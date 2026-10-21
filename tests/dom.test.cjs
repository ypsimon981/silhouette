// Functional checks; these do not replace browser/layout/device verification.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('real client initializes, preserves random retries and exposes sharing only after a win',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://ypsimon981.github.io/silhouette/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=async()=>{throw Error('Offline fixture');};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 script=script.replace('})();','window.__game={setLevel,setup,win:()=>{elapsed=18420;count=10;finishLevel(true);},fail:()=>{elapsed=60000;count=2;finishLevel(false);}};})();');
 try{
  w.eval(script);assert.ok(w.document.querySelector('#social-preferences'));
  assert.equal(w.document.querySelector('#social-actions').hidden,true);
  w.__game.setLevel(1);const original=[...w.document.querySelectorAll('.slot')].map(e=>e.outerHTML).join('');
  w.__game.win();assert.equal(w.document.querySelector('#social-actions').hidden,false);
  assert.ok(w.document.querySelector('#finishTimeValue').textContent);
  w.__game.setup();const retry=[...w.document.querySelectorAll('.slot')].map(e=>e.outerHTML).join('');assert.notEqual(original,retry);
  w.__game.fail();assert.equal(w.document.querySelector('#social-actions').hidden,true);
 }finally{await new Promise(r=>setTimeout(r,25));w.close();}
});
