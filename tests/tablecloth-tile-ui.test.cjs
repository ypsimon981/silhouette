const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('potato linen repeats at fixed size and the animal-footprint exception stays scoped',async()=>{
 const {browser,page,errors}=await fixture();try{
  await page.evaluate(()=>shadowGameTest.setLevel(1));
  await page.waitForFunction(()=>document.querySelector('#board').dataset.tileCloth==='true');
  for(const index of [0,1,2,3,4,5]){
   assert(await page.evaluate(i=>Tablecloths.apply(document.querySelector('#board'),i,true),index));
   assert.equal(await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundRepeat),'repeat');
  }
  const seam=await page.evaluate(async()=>{
   const board=document.querySelector('#board'),url=board.style.getPropertyValue('--arena-art').slice(5,-2),image=new Image();image.src=url;await image.decode();
   const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,512,512).data;
   let max=0;for(let i=0;i<512;i++)for(let k=0;k<3;k++){max=Math.max(max,Math.abs(p[(i*512)*4+k]-p[(i*512+511)*4+k]),Math.abs(p[i*4+k]-p[(511*512+i)*4+k]));}return max;
  });assert.equal(seam,0);
  for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
   await page.setViewportSize(size);assert.equal(await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundSize),'256px 256px');
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>Tablecloths.apply(document.querySelector('#board'),0,true));
  await page.screenshot({path:'/workspace/scratch/e0742c94b4af/seamless-cloth-mobile.png'});
  for(const mode of [17,18]){
   await page.evaluate(m=>shadowGameTest.setLevel(m),mode);
   await page.waitForFunction(mode=>{const b=document.querySelector('#board');return !b.dataset.tileCloth&&(mode===17?b.dataset.photoCloth==='animal-tracks':b.dataset.photoCloth!=='animal-tracks');},mode);
   assert.equal(await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundSize),mode===17?'288px 288px':'cover');
   assert.equal(await page.locator('#board').evaluate(e=>getComputedStyle(e,'::before').backgroundRepeat),mode===17?'repeat':'no-repeat');
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
