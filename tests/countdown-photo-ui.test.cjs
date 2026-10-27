const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('photographic START and 3–2–1 work in potato, animal and flower modes without changing clock start',async()=>{
 const {browser,page,errors}=await fixture();try{
  for(const mode of [1,17,18]){
   await page.evaluate(m=>shadowGameTest.setLevel(m),mode);
   const start=page.locator('#startButton img');
   assert.match(await start.getAttribute('src'),/countdown-start-photo\.webp/);
   await start.evaluate(i=>i.decode());
   await page.evaluate(()=>Promise.all([3,2,1].map(n=>{const i=new Image();i.src='./assets/brand/countdown-'+n+'-photo.webp?v=1';return i.decode();})));
   if(mode!==1)assert.equal(await page.locator('.flour-slot').count(),0);
   if(mode===1&&process.env.COUNTDOWN_SCREENSHOTS)await page.screenshot({path:process.env.COUNTDOWN_SCREENSHOTS+'-start.png'});
   const before=Date.now();await page.locator('#startButton').click();
   for(const n of [3,2,1]){
    await page.waitForFunction(n=>document.querySelector('#countNumber').dataset.digit===String(n),n);
    assert.equal((await page.evaluate(()=>shadowGameTest.state())).phase,'countdown');
    assert.equal(await page.locator('#clock').textContent(),'00:00.000');
    const image=page.locator('#countNumber img');assert.match(await image.getAttribute('src'),new RegExp('countdown-'+n+'-photo\\.webp'));
    await image.evaluate(i=>i.decode());assert(await image.evaluate(i=>i.naturalWidth>0));
    if(mode===1&&n===3&&process.env.COUNTDOWN_SCREENSHOTS){await page.waitForTimeout(300);await page.screenshot({path:process.env.COUNTDOWN_SCREENSHOTS+'-three.png'});}
   }
   await page.waitForFunction(()=>shadowGameTest.state().phase==='playing');
   assert(Date.now()-before>=2850);
   assert.equal(await page.locator('#countdown').isVisible(),false);assert.equal(await page.locator('.piece:not(.done)').count(),1);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
