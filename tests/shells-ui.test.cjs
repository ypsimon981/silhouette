const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,ids:()=>ids,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('Shells reveals the aligned images after ten real placements and leaves other modes untouched',async()=>{
 const {browser,page,errors}=await fixture();try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:560,height:1000}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>{shadowGameTest.setLevel(19);shadowGameTest.play()});
  assert.equal(await page.locator('.slot').count(),10);assert.equal(await page.locator('.flour-slot,.photo-potato').count(),0);
  assert.match(await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundImage),/shell-sand.webp/);
  assert.equal(await page.evaluate(()=>new Set(shadowGameTest.ids()).size),10);
  for(let i=0;i<10;i++){
   const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:2});await page.mouse.up();assert.equal((await page.evaluate(()=>shadowGameTest.state())).count,i+1);if(i===4&&process.env.SHELLS_SCREENSHOT_DIR)await page.screenshot({path:process.env.SHELLS_SCREENSHOT_DIR+'/shells-playing-'+viewport.width+'.png'});
  }
  assert.equal((await page.evaluate(()=>shadowGameTest.state())).phase,'finished');await page.waitForFunction(()=>[...document.querySelectorAll('.piece.done .animal-piece')].every(e=>e.classList.contains('photo-loaded')));
  assert.equal(await page.locator('.piece.done .animal-photo').count(),10);assert.match(await page.locator('#finishLevelName').textContent(),/Conchiglie|Shells/);
  if(process.env.SHELLS_SCREENSHOT_DIR)await page.screenshot({path:process.env.SHELLS_SCREENSHOT_DIR+'/shells-finish-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 for(const [mode,texture] of [[17,'animal-tracks.svg'],[18,'grass-stylized.webp'],[1,null]]){await page.evaluate(m=>shadowGameTest.setLevel(m),mode);const image=await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundImage);assert(!image.includes('shell-sand.webp'));if(texture)assert(image.includes(texture));}
 await page.locator('#homeButton').click();assert.equal(await page.locator('#shellsLaunch').isVisible(),true);await page.locator('#shellsLaunch').click();assert.match(await page.locator('#levelTitle').textContent(),/CONCHIGLIE|SHELLS/);
 if(process.env.SHELLS_SCREENSHOT_DIR){
  await page.setViewportSize({width:800,height:940});
  await page.evaluate(()=>{
   const review=document.createElement('div');review.id='shellCatalogReview';review.style.cssText='position:fixed;inset:0;z-index:99999;background:#e6d2af;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;overflow:auto';
   const style=document.createElement('style');style.textContent='#shellCatalogReview svg{width:100%;height:180px}#shellCatalogReview .animal-photo{opacity:1!important}#shellCatalogReview .animal-outline{opacity:0!important}';document.head.append(style);
   for(const shell of shadowGameTest.catalog.filter(s=>s.shell)){const item=document.createElement('div');item.append(shadowGameTest.shape3D(shell));const name=document.createElement('small');name.textContent=shell.family;item.append(name);review.append(item)}document.querySelector('#board').append(review);
  });
  await page.waitForTimeout(300);await page.screenshot({path:process.env.SHELLS_SCREENSHOT_DIR+'/shells-catalog.png'});
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
