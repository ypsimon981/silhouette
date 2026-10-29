// Real mobile drag/release tests, local assets only; no production scores or account writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
async function fixture(){
 const root=process.cwd(),server=http.createServer((req,res)=>{
  const file=path.resolve(root,new URL(req.url,'http://local').pathname.slice(1)||'index.html');
  try{if(!file.startsWith(root+path.sep))throw Error('path');let body=fs.readFileSync(file);
   if(file.endsWith('/index.html'))body=body.toString().replace('initializeUI();applyLanguage();setup();goHome();',`window.precisionTest={state:()=>({mode,phase,count,start,result:precisionSession?.result()}),elapsed:ms=>{start=performance.now()-ms;},expire:()=>{start=performance.now()-30001;update();}};initializeUI();applyLanguage();setup();goHome();`);
   res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu']});
 return {browser,server,url:'http://127.0.0.1:'+server.address().port};
}
async function drag(page,where){
 const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator(where==='target'?'.slot':'#board').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
 await page.mouse.move(where==='target'?b.x+b.width/2:b.x+3,where==='target'?b.y+b.height/2:b.y+3,{steps:2});await page.mouse.up();
}
const personal=()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>/^(silhouette_record_|10shapes_attempt_|10shapes_behavior_|10potatoes_cognitive_v1:)/.test(k)));
test('30-second challenge: real placements, errors, deadline, local record, retry, exit and ordinary-mode isolation',async()=>{
 const {browser,server,url}=await fixture();
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route(/^https:\/\//,r=>{remote.push({url:r.request().url(),body:r.request().postData()});return r.abort();});
  await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10shapes_nick','Fixture');localStorage.setItem('10shapes_player_id','11111111-1111-4111-8111-111111111111');});
  await page.goto(url);const before=await page.evaluate(personal);
  await page.locator('#precisionLaunch').click();assert.equal(await page.locator('.slot').count(),1);assert.equal(await page.locator('.piece').count(),0);
  assert.equal(await page.locator('#clock').innerText(),'00:30.000');assert.match(await page.locator('#preGameDetail').innerText(),/10 posizioni/);
  await page.locator('#startButton').click();assert.equal((await page.evaluate(()=>precisionTest.state())).phase,'countdown');await page.waitForSelector('.piece');
  assert.equal((await page.evaluate(()=>precisionTest.state())).phase,'playing');
  for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.locator('header').evaluate(e=>e.scrollWidth>e.clientWidth),false);}
  const first=await page.locator('.slot').getAttribute('data-position');
  await drag(page,'miss');assert.equal(await page.locator('.slot').getAttribute('data-position'),first);assert.equal((await page.evaluate(()=>precisionTest.state())).result.errors,1);
  const cancelled=await page.locator('.piece').boundingBox();await page.mouse.move(cancelled.x+cancelled.width/2,cancelled.y+cancelled.height/2);await page.mouse.down();await page.locator('.piece').dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();assert.equal((await page.evaluate(()=>precisionTest.state())).result.errors,1);
  const positions=[];
  for(let i=0;i<24;i++){
   await page.evaluate(()=>precisionTest.elapsed(1000));positions.push(Number(await page.locator('.slot').getAttribute('data-position')));await drag(page,'target');
   assert.equal(await page.locator('.slot').count(),1);assert.equal(await page.locator('.piece').count(),1);assert.equal((await page.evaluate(()=>precisionTest.state())).phase,'playing');
  }
  for(let i=0;i<20;i+=10)assert.equal(new Set(positions.slice(i,i+10)).size,10);
  for(let i=1;i<positions.length;i++)assert.ok(!([0,2,7,9].includes(positions[i-1])&&[0,2,7,9].includes(positions[i])));
  assert.equal((await page.evaluate(()=>precisionTest.state())).result.placed,24);
  // A correctly aimed release after the deadline must not become a 25th success.
  const a=await page.locator('.piece').boundingBox(),b=await page.locator('.slot').boundingBox();
  await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
  await page.evaluate(()=>precisionTest.elapsed(30001));await page.mouse.up();await page.waitForSelector('#board.complete');
  assert.equal((await page.evaluate(()=>precisionTest.state())).phase,'finished');
  assert.equal(await page.locator('[data-precision="placed"]').innerText(),'24');assert.equal(await page.locator('[data-precision="errors"]').innerText(),'1');assert.equal(await page.locator('[data-precision="precision"]').innerText(),'96%');
  assert.equal(await page.locator('#clock').innerText(),'00:00.000');assert.equal(await page.locator('.piece,.slot').count(),0);
  assert.deepEqual(await page.evaluate(personal),before);assert.ok(remote.every(r=>!r.url.includes('level=20')&&!r.body?.includes('"level":20')));
  for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await page.locator('#again').isVisible());assert.ok(await page.locator('#finishHome').isVisible());assert.equal(await page.locator('#nextLevel').isVisible(),false);}
  fs.mkdirSync('test-results',{recursive:true});await page.locator('#finish').screenshot({path:'test-results/precision-speed-result.png'});
  await page.locator('#again').click();await page.locator('#leftHand').click();assert.equal((await page.evaluate(()=>precisionTest.state())).result.placed,0);assert.equal(await page.locator('#best').innerText(),'0 · 0');
  await page.locator('#startButton').click();await page.waitForSelector('.piece');await page.screenshot({path:'test-results/precision-speed-playing.png'});await page.evaluate(()=>precisionTest.expire());assert.equal(await page.locator('[data-precision="precision"]').innerText(),'—');assert.match(await page.locator('#summary').innerText(),/24 forme/);
  await page.locator('#finishHome').click();await page.locator('#precisionLaunch').click();await page.locator('#startButton').click();await page.locator('#homeButton').click();await page.waitForTimeout(3100);assert.equal((await page.evaluate(()=>precisionTest.state())).phase,'home');assert.equal(await page.locator('.piece').count(),0);
  await page.locator('[data-mode="1"]').click();assert.equal(await page.locator('.slot').count(),10);assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('precision-speed')),false);
  assert.equal(await page.locator('#precisionResults').isVisible(),false);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
