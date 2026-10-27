const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('dark grass is flower-only with readable original targets and unchanged placement',async()=>{
 const {browser,page,errors}=await fixture();try{
  await page.evaluate(()=>{shadowGameTest.setLevel(18);shadowGameTest.play();});
  const result=await page.locator('#board').evaluate(e=>({image:getComputedStyle(e,'::before').backgroundImage,size:getComputedStyle(e,'::before').backgroundSize,animation:getComputedStyle(e,'::before').animationName,color:getComputedStyle(e,'::before').backgroundColor}));
  assert(result.image.includes('grass-dark.webp'));assert.equal(result.size,'256px 256px');assert.equal(result.animation,'none');assert.equal(result.color,'rgb(27, 53, 39)');
  assert.equal(await page.locator('.slot .recess-rim').count(),10);assert.equal(await page.locator('.flour-slot,.photo-potato').count(),0);
  assert.equal(await page.locator('.slot .recess-rim').first().evaluate(e=>getComputedStyle(e).stroke),'rgb(193, 209, 174)');
  await page.evaluate(async()=>{const i=new Image();i.src='./assets/backgrounds/grass-dark.webp';await i.decode();const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const p=ctx.getImageData(0,0,512,512).data;for(let n=0;n<512;n++)for(let k=0;k<3;k++)if(p[n*4+k]!==p[(511*512+n)*4+k]||p[(n*512)*4+k]!==p[(n*512+511)*4+k])throw Error('Grass tile seam');});
  if(process.env.FLOWER_BACKGROUND_SCREENSHOT)await page.screenshot({path:process.env.FLOWER_BACKGROUND_SCREENSHOT});
  for(let i=0;i<10;i++){
   const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();
   await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:2});await page.mouse.up();assert.equal((await page.evaluate(()=>shadowGameTest.state())).count,i+1);
  }
  assert.equal((await page.evaluate(()=>shadowGameTest.state())).phase,'finished');
  for(const mode of [17,1]){await page.evaluate(m=>shadowGameTest.setLevel(m),mode);assert(!await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundImage.includes('grass-dark.webp')));}
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
