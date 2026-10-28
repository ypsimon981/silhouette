// Local browser fixture: no production scores, accounts or ad requests.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
async function fixture(){
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!=='https://potato.test')return route.abort();
  const file=path.resolve(url.pathname==='/'?'index.html':'.'+url.pathname);
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.abort();
  let body=fs.readFileSync(file);
  if(file.endsWith('index.html'))body=body.toString().replace('initializeUI();applyLanguage();setup();goHome();',`window.resultsTest={setLevel,state:()=>({mode,level,phase}),win:(ms)=>{beginSectors();sectorMarks=[Math.round(ms*.2),Math.round(ms*.6),ms];elapsed=ms;count=10;finishLevel(true)},fail:()=>{elapsed=60000;count=2;finishLevel(false)},resetRecord:()=>localStorage.removeItem(recordKey())};initializeUI();applyLanguage();setup();goHome();`);
  if(file.endsWith('social-config.js'))body=body.toString().replace('enabled: true','enabled: false');
  const ext=path.extname(file);return route.fulfill({body,contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpeg':'image/jpeg','.png':'image/png'})[ext]||'application/octet-stream'});
 });
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');});
 await page.goto('https://potato.test/');return {browser,page};
}
async function result(page,mode=12,ms=14910){
 await page.evaluate(({mode,ms})=>{resultsTest.setLevel(mode);resultsTest.win(ms)}, {mode,ms});
 // Realistic leaderboard height including the existing explanatory text.
 await page.locator('#recordPositions').evaluate(panel=>{panel.innerHTML='<div>CLASSIFICA DEL LIVELLO</div><div>Miglior tempo mondiale: 00:14.910</div><div>La tua posizione: 1 / 4</div>'+[1,2,3,4,5].map(i=>'<div class="resultRankRow"><span>'+i+'. Giocatore</span><strong>00:18.860</strong></div>').join('')+'<div class="demoHint">Posizioni e distacchi sui migliori tempi personali online, inclusi eventuali profili DEMO.</div>';});
}
test('results show four paired action rows, a taller ad footer and working adjacent levels',async()=>{
 const {browser,page}=await fixture();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932}]){
   await page.setViewportSize(viewport);await result(page);
   const layout=await page.evaluate(()=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    return {again:rect('again'),home:rect('finishHome'),prev:rect('previousLevel'),next:rect('nextLevel'),ranking:rect('finishRanking'),profile:rect('finishProgress'),social:rect('social-actions'),footer:document.querySelector('footer').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>innerWidth,finish:rect('finish'),score:rect('finishScore'),commands:rect('finishCommands')};
   });
   assert.equal(layout.again.y,layout.home.y);assert.equal(layout.prev.y,layout.next.y);assert.equal(layout.ranking.y,layout.profile.y);
   assert.ok(layout.again.y<layout.prev.y&&layout.prev.y<layout.ranking.y&&layout.ranking.y<layout.social.y);
   assert.ok(layout.prev.w>0);assert.ok(layout.prev.h>=44);assert.ok(layout.footer>=85);assert.equal(layout.overflow,false);
   assert.ok(layout.commands.y-(layout.score.y+layout.score.h)<=14,'No large gap before commands');
   if(viewport.height>=844)assert.ok(layout.social.y+layout.social.h<=layout.finish.y+layout.finish.h,'All actions fit in a standard phone result');
   if(viewport.height===844)await page.screenshot({path:'/workspace/scratch/d24a3787e96c/results-implemented.png'});
  }
  await page.setViewportSize({width:390,height:844});await result(page);
  await page.locator('#previousLevel').click();assert.equal((await page.evaluate(()=>resultsTest.state())).level,8);
  await result(page);await page.locator('#nextLevel').click();assert.equal((await page.evaluate(()=>resultsTest.state())).level,10);
  await result(page,1);assert.equal(await page.locator('#previousLevel').isDisabled(),true);
  await result(page,13);assert.equal(await page.locator('#nextLevel').isDisabled(),true);
  await page.locator('#finishHome').click();assert.equal(await page.locator('#homePage').isVisible(),true);
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
test('gold confetti appear only for improved existing potato records, clean up, and respect reduced motion',async()=>{
 const {browser,page}=await fixture();try{
  await page.evaluate(()=>{resultsTest.setLevel(12);resultsTest.resetRecord();resultsTest.win(15000)});
  assert.equal(await page.locator('#recordConfetti').count(),0);
  await result(page,12,14910);assert.equal(await page.locator('#recordConfetti i').count(),16);
  await page.locator('#recordConfetti').waitFor({state:'detached'});
  await result(page,12,14950);assert.equal(await page.locator('#recordConfetti').count(),0);
  await page.emulateMedia({reducedMotion:'reduce'});await result(page,12,14800);assert.equal(await page.locator('#recordConfetti').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await result(page,12,14700);await page.locator('#again').click();assert.equal(await page.locator('#recordConfetti').count(),0);
  for(const mode of [17,18,19]){
   await result(page,mode,16000);await result(page,mode,15000);
   assert.equal(await page.locator('#recordConfetti').count(),0);
   assert.equal(await page.locator('#previousLevel').isVisible(),false);
   const footerHeight=await page.locator('footer').evaluate(el=>el.getBoundingClientRect().height);assert.ok(footerHeight<100,'Special level footer retains existing height');
  }
  await page.evaluate(()=>{resultsTest.setLevel(12);resultsTest.fail()});
  assert.equal(await page.locator('#recordConfetti').count(),0);assert.equal(await page.locator('#social-actions').isVisible(),false);
 }finally{await browser.close()}
});
