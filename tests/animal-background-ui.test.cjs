const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('animal-footprint background is static, animal-only and preserves silhouette play',async()=>{
 const {browser,page,errors}=await fixture();try{
  await page.evaluate(()=>{shadowGameTest.setLevel(17);shadowGameTest.play();});
  await page.waitForFunction(()=>document.querySelector('#board').dataset.photoCloth==='animal-tracks');
  const style=await page.locator('#board').evaluate(e=>({image:getComputedStyle(e,'::before').backgroundImage,size:getComputedStyle(e,'::before').backgroundSize,animation:getComputedStyle(e,'::before').animationName}));
  assert(style.image.includes('animal-tracks.svg'));assert.equal(style.size,'288px 288px');assert.equal(style.animation,'none');
  assert.equal(await page.locator('.flour-slot,.photo-potato').count(),0);
  assert.equal(await page.locator('.slot .recess-rim').count(),10);
  if(process.env.ANIMAL_BACKGROUND_SCREENSHOT)await page.screenshot({path:process.env.ANIMAL_BACKGROUND_SCREENSHOT});
  for(let i=0;i<10;i++){
   const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:2});await page.mouse.up();assert.equal((await page.evaluate(()=>shadowGameTest.state())).count,i+1);
  }
  assert.equal((await page.evaluate(()=>shadowGameTest.state())).phase,'finished');
  for(const mode of [18,1]){
   await page.evaluate(m=>shadowGameTest.setLevel(m),mode);
   await page.waitForFunction(()=>document.querySelector('#board').dataset.photoCloth!=='animal-tracks');
   assert(!await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundImage.includes('animal-tracks.svg')));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
