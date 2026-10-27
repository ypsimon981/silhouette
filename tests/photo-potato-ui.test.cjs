const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('all photographic potatoes preserve every original contour, rotations, placement and non-potato rendering',async()=>{
 const {browser,page,errors}=await fixture();try{
  await page.evaluate(()=>shadowGameTest.setLevel(1));
  assert((await page.evaluate(()=>PhotoPotatoes.preload())).every(Boolean));
  const requests=[];page.on('request',r=>{if(r.url().includes('/assets/potato-photo/'))requests.push(r.url());});
  await page.evaluate(()=>shadowGameTest.setLevel(13));
  assert((await page.evaluate(()=>PhotoPotatoes.preload(PhotoPotatoes.entries.filter(e=>e.family.startsWith('organic10-'))))).every(Boolean));
  assert.equal(new Set(requests).size,10);
  assert((await page.evaluate(()=>PhotoPotatoes.preload(PhotoPotatoes.entries))).every(Boolean));
  assert.equal(await page.evaluate(()=>PhotoPotatoes.entries.length),91);
  await page.evaluate(()=>shadowGameTest.setLevel(1));
  const result=await page.evaluate(()=>{
   const original=Math.random;Math.random=()=>{throw Error('Cosmetic RNG')};
   let variants=0;
   for(const shape of shadowGameTest.catalog.filter(e=>PhotoPotatoes.entries.some(a=>a.raw===e.path))){
    const svg=shadowGameTest.shape3D(shape),e=PhotoPotatoes.entries.find(e=>e.raw===shape.path);
    if(!svg.classList.contains('photo-potato'))throw Error('Photographic body absent');
    if(svg.querySelector('.front-face').getAttribute('d')!==e.path||svg.querySelector('clipPath path').getAttribute('d')!==e.path)throw Error('Contour changed');
    if(svg.querySelector('g').getAttribute('transform')!=='rotate('+shape.rotation+' 50 50)')throw Error('Rotation changed');
    if(svg.querySelector('filter')||svg.querySelector('.potatoFace'))throw Error('Unexpected live filter or face');variants++;
   }
   Math.random=original;return variants;
  });assert.equal(result,123);
  for(const mode of [1,2,4,7,8,9,10,11,12,13]){
   await page.evaluate(m=>{shadowGameTest.setLevel(m);shadowGameTest.play();},mode);
   for(let i=0;i<10;i++){
    assert.equal(await page.locator('.piece:not(.done) .photo-potato').count(),1);
    const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:2});await page.mouse.up();
    assert.equal((await page.evaluate(()=>shadowGameTest.state())).count,i+1);
   }
   assert.equal((await page.evaluate(()=>shadowGameTest.state())).phase,'finished');
  }
  for(const mode of [17,18]){await page.evaluate(m=>{shadowGameTest.setLevel(m);shadowGameTest.play();},mode);assert.equal(await page.locator('.piece .photo-potato').count(),0);}
  await page.evaluate(()=>{shadowGameTest.setLevel(1);shadowGameTest.play();});
  if(process.env.PHOTO_POTATO_SCREENSHOTS)await page.screenshot({path:process.env.PHOTO_POTATO_SCREENSHOTS+'-playing.png'});
  await page.evaluate(()=>{
   const b=document.querySelector('#board');b.querySelectorAll('.slot,.piece').forEach(e=>e.remove());b.style.setProperty('--arena-art','none');
   PhotoPotatoes.entries.forEach((e,i)=>{const p=document.createElement('div');p.className='piece';p.style.left=(16.7+i%3*33.3)+'%';p.style.top=(12+Math.floor(i/3)*25)+'%';p.append(PhotoPotatoes.create({path:e.raw,rotation:0},e.path));b.append(p);});
  });
  await page.waitForTimeout(300);if(process.env.PHOTO_POTATO_SCREENSHOTS)await page.screenshot({path:process.env.PHOTO_POTATO_SCREENSHOTS+'-all-base.png'});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
