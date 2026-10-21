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
  w.document.querySelector('[data-stat="9"]').click();assert.equal(w.document.querySelector('#playAnalyzedLevel').textContent,'▶ Gioca di nuovo livello 6');
  w.document.querySelector('#playAnalyzedLevel').click();assert.match(w.document.querySelector('#levelTitle').textContent,/LIVELLO 6/);assert.equal(w.document.querySelector('#myProgress').style.display,'none');
  w.document.querySelector('[data-stat="14"]').click();assert.equal(w.document.querySelector('#playAnalyzedLevel').textContent,'▶ Gioca di nuovo Overall');
  w.document.querySelector('#playAnalyzedLevel').click();assert.match(w.document.querySelector('#levelTitle').textContent,/OVERALL/);
 }finally{await new Promise(r=>setTimeout(r,25));w.close();}
});

test('START launches countdown immediately while online requests remain pending',async()=>{
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://ypsimon981.github.io/silhouette/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=()=>new Promise(()=>{});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 try{w.eval(script);w.document.querySelector('[data-mode="1"]').click();w.document.querySelector('#startButton').click();
 assert.equal(w.document.querySelector('#startButton').style.display,'none');
 assert.equal(w.document.querySelector('#countNumber').style.display,'block');
 assert.equal(w.document.querySelector('#startButton').disabled,false);
 }finally{w.close()}
});

test('social scripts use the current release cache key',()=>{
 const html=fs.readFileSync('index.html','utf8'),release=html.match(/v(0\.21\.\d+)<\/span>/)[1];
 for(const asset of ['social.js','social-config.js'])assert.ok(html.includes(asset+'?v='+release));
});

test('requested reset clears only target player timings once and preserves identity',()=>{
 const html=fs.readFileSync('index.html','utf8'),code=html.slice(html.indexOf("const PERSONAL_RESET="),html.indexOf('const HISTORY_KEY='));
 const target='d41ebc45-0813-4c53-873c-15307acba7e3';
 function run(id){const m=new Map([['10shapes_social_session',JSON.stringify({user:{id}})],['silhouette_record_10_handed','6953'],['10shapes_nick','Ypsimon'],['10shapes_sectors_v1',JSON.stringify({[target+':1']:{},'other:1':{}})]]);const storage={get length(){return m.size},key:i=>[...m.keys()][i],getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};const apply=()=>require('node:vm').runInNewContext(code,{playerId:id,localStorage:storage});apply();return {m,apply}}
 const other=run('other');assert.equal(other.m.get('silhouette_record_10_handed'),'6953');
 const own=run(target);assert.equal(own.m.has('silhouette_record_10_handed'),false);assert.equal(own.m.get('10shapes_nick'),'Ypsimon');assert.ok(own.m.has('10shapes_social_session'));assert.deepEqual(Object.keys(JSON.parse(own.m.get('10shapes_sectors_v1'))),['other:1']);own.m.set('silhouette_record_10_handed','9000');own.apply();assert.equal(own.m.get('silhouette_record_10_handed'),'9000');
});
