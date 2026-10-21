const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const flush=()=>new Promise(r=>setTimeout(r,15));
function fixture(){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://ypsimon981.github.io/silhouette/',runScripts:'outside-only'}),w=dom.window;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.localStorage.setItem('10shapes_social_session',JSON.stringify({access_token:'TEST_ONLY',expires_at:9999999999,user:{id:'00000000-0000-4000-8000-000000000001'}}));
 const requests=[];w.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);requests.push(b);return {ok:true,json:async()=>b.action==='profile'?{preferences:{}}:b.action==='challenge_best'?{code:'a'.repeat(32),level:1,time_ms:6953}:{}};};
 w.URL.createObjectURL=()=> 'blob:TEST_ONLY';w.URL.revokeObjectURL=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{})});
 w.HTMLCanvasElement.prototype.toBlob=function(fn){fn(new w.Blob(['fixture'],{type:'image/png'}));};
 Object.defineProperty(w.navigator,'canShare',{value:()=>true,configurable:true});
 let outcome='success',payload;
 Object.defineProperty(w.navigator,'share',{value:async data=>{payload=data;if(outcome==='cancel')throw new w.DOMException('Cancelled','AbortError');if(outcome==='error')throw Error('Sharing failed');},configurable:true});
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const social=w.SilhouetteSocial.init({profile:()=>({nickname:'Tester',country:'IT',hand:'right'}),identity(){},playing:()=>false});
 return {w,dom,social,requests,setOutcome:v=>outcome=v,payload:()=>payload,close:()=>w.close()};
}
test('challenge from leaderboard uses server record; success closes, cancellation/error retain the dialog',async()=>{
 const f=fixture(),{w,social}=f;
 try{
  social.ranking(1,{time_ms:6953});w.document.getElementById('social-ranking-send').click();await flush();await flush();
  assert.ok(f.requests.some(r=>r.action==='challenge_best'&&r.data.level===1));
  let d=w.document.querySelector('.social-dialog');assert.match(d.querySelector('textarea').value,/6,95 s/);
  const send=[...d.querySelectorAll('button')].find(x=>x.textContent==='Condividi');
  f.setOutcome('cancel');send.click();await flush();assert.ok(d.isConnected);assert.equal(send.disabled,false);
  f.setOutcome('error');send.click();await flush();assert.ok(d.isConnected);
  f.setOutcome('success');send.click();await flush();assert.equal(d.isConnected,false);assert.match(f.payload().url,/#c\//);
  social.ranking(2,null,'loading');assert.equal(w.document.getElementById('social-ranking-send').disabled,true);
  social.ranking(14,{time_ms:9999});assert.equal(w.document.getElementById('social-ranking-challenge').hidden,true);
 }finally{f.close();}
});
test('image share closes on success, keeps preview on cancellation and releases its object URL',async()=>{
 const f=fixture(),{w,social}=f;
 try{
  social.finish({won:true,mode:1,ms:8918,previous:6953});
  [...w.document.getElementById('social-actions').querySelectorAll('button')].find(b=>b.textContent==='Condividi risultato').click();await flush();
  const d=w.document.querySelector('.social-dialog'),send=[...d.querySelectorAll('button')].find(b=>b.textContent==='Condividi immagine');assert.equal(send.disabled,false);
  f.setOutcome('cancel');send.click();await flush();assert.ok(d.isConnected);
  f.setOutcome('success');send.click();await flush();assert.equal(d.isConnected,false);assert.equal(f.payload().files.length,1);
 }finally{f.close();}
});

test('parallel startup waits only at results to satisfy server elapsed-time guard',async()=>{
 const f=fixture(),{w,social}=f;let now=1000,scheduled;
 Object.defineProperty(w.performance,'now',{value:()=>now});
 const realTimeout=w.setTimeout.bind(w);
 try{
  assert.equal(await social.begin(1),true);
  now=10000;
  w.setTimeout=(fn,delay,...args)=>{if(delay>100){scheduled={fn,delay};return 12345}return realTimeout(fn,delay,...args)};
  social.finish({won:true,mode:1,ms:8636,previous:6953});
  assert.equal(scheduled.delay,2186);
  assert.equal(f.requests.some(r=>r.action==='run_finish'),false);
  assert.match(w.document.querySelector('#social-result').textContent,/Verifica/);
  now+=scheduled.delay;scheduled.fn();await flush();await flush();
  assert.ok(f.requests.some(r=>r.action==='run_finish'&&r.data.time_ms===8636));
 }finally{f.close()}
});
