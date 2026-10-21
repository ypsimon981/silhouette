// Browser geometry and pointer regression; all network requests are local fixtures.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const debug=`window.potatoUI={shapeCatalog,shape3D,shape,potatoPath,setLevel,play:()=>{phase="playing";start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove("stage-raised");board.classList.add("board-live");document.getElementById("preGameIdentity").hidden=true;document.getElementById("countdown").style.display="none";next()},state:()=>({count,phase,start}),goHome,begin,renderCountdownDigit,win:()=>{while(count<10){const p=active,target=slots[count];p.style.left=target.style.left;p.style.top=target.style.top;p.classList.add("done");target.classList.add("done");count++;captureSector(count);active=null;if(count<10)next()}elapsed=18420;finishLevel(true)},timeout:()=>{elapsed=60000;finishLevel(false)},hand:value=>{handed=value;handLabel()}};})();`;
async function fixture(){
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const page=await browser.newPage();
 await page.route('https://potato.test/**',r=>{
  const name=new URL(r.request().url()).pathname.slice(1)||'index.html';
  if(!['index.html','social-config.js','social.js','social.css','potato-theme.css','favicon.svg','assets/brand/10potatoes-board.jpeg'].includes(name))return r.abort();
  let body=fs.readFileSync(name,name.endsWith('.jpeg')?undefined:'utf8');
  if(name==='index.html')body=body.replace(/\}\)\(\);\s*<\/script><\/body>/,debug+'</script></body>');
  if(name==='social-config.js')body=body.replace('enabled: true','enabled: false');
  return r.fulfill({body,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.jpeg')?'image/jpeg':'text/html'});
 });
 await page.route('https://bboijzuzhgvfxqrsfatw.supabase.co/**',r=>r.fulfill({json:{scores:[],total:0}}));
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');});
 await page.goto('https://potato.test/');
 return {browser,page};
}

test('kitchen countdown cuts three numbered slices then removes every platform and countdown prop',async()=>{
 const {browser,page}=await fixture();try{
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>potatoUI.setLevel(1));
  assert.equal(await page.locator('#startButton .burnedStart').textContent(),'START');
  await page.screenshot({path:'/tmp/potato-start-v224.png'});
  await page.locator('#startButton').click();
  for(const n of [3,2,1]){
   await page.waitForFunction(n=>document.querySelector('#countNumber').dataset.digit===String(n),n);
   assert.equal((await page.evaluate(()=>potatoUI.state())).start,null);
   assert.equal(await page.locator('#countNumber [data-slice]').count(),4-n);
   assert.ok((await page.locator('#countNumber').boundingBox()).width>150);
   assert.equal(await page.locator('#countNumber').evaluate(e=>getComputedStyle(e).clipPath),'none');
   assert.equal(await page.locator('#countNumber .slice-current .sliceNumber').textContent(),String(n));
   if(n===2){await page.waitForTimeout(400);await page.screenshot({path:'/tmp/potato-cut-v224.png'});}
  }
  await page.waitForFunction(()=>potatoUI.state().phase==='playing');
  assert.equal(await page.locator('.pedestal,.glassLayer').count(),0);
  assert.equal(await page.locator('#countdown').isVisible(),false);
  assert.equal(await page.locator('.piece').count(),1);
  await page.screenshot({path:'/tmp/potato-playing-v224.png'});
 }finally{await browser.close()}
});
test('central results never overlap potatoes; expressions stay animated on win, timeout and resize in both hands',async()=>{
 const {browser,page}=await fixture();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const hand of ['left','right'])for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(const won of [true,false]){
   await page.evaluate(({hand,won})=>{potatoUI.hand(hand);potatoUI.setLevel(1);potatoUI.play();if(won)potatoUI.win();else potatoUI.timeout()},{hand,won});
   const result=await page.evaluate(()=>{
    const card=document.querySelector('#finish'),r=card.getBoundingClientRect(),pieces=[...document.querySelectorAll('.piece')];
    const overlapping=pieces.filter(p=>{const b=p.getBoundingClientRect();return r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top});
    return {overlapping:overlapping.length,count:pieces.length,filter:getComputedStyle(card).backdropFilter,scroll:card.scrollHeight>=card.clientHeight,eyeAnimations:pieces.every(p=>getComputedStyle(p.querySelector('.potatoEyes')).animationName==='potatoBlink'),after:getComputedStyle(document.querySelector('#board'),'::after').display,visible:card.clientWidth>90&&card.clientHeight>100,bodyWidth:document.documentElement.scrollWidth};
   });
   assert.equal(result.overlapping,0,JSON.stringify({hand,size,won,result}));assert.equal(result.after,'none');assert.equal(result.filter,'none');assert.ok(result.eyeAnimations);assert.ok(result.visible);assert.equal(result.count,won?10:1);assert.ok(result.bodyWidth<=size.width);
   if(won){
    assert.ok(await page.locator("#again").evaluate(e=>{const a=e.getBoundingClientRect(),b=document.querySelector("#finish").getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom}),"Rigioca must be visible without scrolling");
    await page.screenshot({path:'/tmp/potato-finish-'+size.width+'-'+hand+'-v224.png'});
    // Actions remain reachable through the central panel, including social actions.
    await page.locator('#finishProgress').scrollIntoViewIfNeeded();await page.locator('#finishProgress').click();
    assert.equal(await page.locator('#myProgress').isVisible(),true);
    await page.locator('#closeProgress').click();
   }
  }
 }
 // Rotate/resize an already completed game: ResizeObserver must recalculate the corridor.
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{potatoUI.setLevel(1);potatoUI.play();potatoUI.win()});
 await page.setViewportSize({width:768,height:1024});await page.waitForTimeout(100);
 assert.ok(await page.evaluate(()=>{const c=document.querySelector('#finish').getBoundingClientRect(),b=document.querySelector('#board').getBoundingClientRect();return c.left>b.left&&c.right<b.right&&c.top>b.top&&c.bottom<b.bottom}));
 assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});

test('supplied artwork and matte brown/cream theme cover home, profile, rankings and exported result cards',async()=>{
 const {browser,page}=await fixture();try{
  await page.setViewportSize({width:390,height:844});
  const asset=await page.evaluate(async()=>{const i=new Image();i.src='./assets/brand/10potatoes-board.jpeg?v=0.22.5';await i.decode();return {width:i.naturalWidth,height:i.naturalHeight}});
  assert.deepEqual(asset,{width:1536,height:768});
  assert.equal(await page.locator('#homePage .brandArt image').count(),1);
  assert.ok(await page.locator('#homePage .brandArt').isVisible());
  assert.ok(await page.locator('#homeButton .toolbarPotato').isVisible());
  const paint=await page.evaluate(()=>{const b=getComputedStyle(document.querySelector('#rankingButton'));return {button:b.backgroundImage,home:getComputedStyle(document.querySelector('#homePage')).backgroundColor}});
  assert.ok(paint.button.includes('data:image/svg+xml'));assert.ok(!paint.button.includes('gradient'));assert.equal(paint.home,'rgb(255, 240, 208)');
  await page.screenshot({path:'/tmp/potato-brand-home-390.png'});
  await page.locator('#profileButton').click();await page.screenshot({path:'/tmp/potato-brand-profile-390.png'});
  assert.equal(await page.locator('.profilePanel').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 240, 208)');
  await page.locator('#closeProfile').click();await page.locator('#homeRanking').click();
  assert.ok(await page.locator('#ranking .selected').evaluateAll(es=>es.every(e=>!getComputedStyle(e).backgroundImage.includes('gradient'))));
  await page.screenshot({path:'/tmp/potato-brand-ranking-390.png'});
  await page.locator('#closeRanking').click();
  await page.evaluate(()=>{potatoUI.setLevel(1);potatoUI.play();potatoUI.win()});
  await page.screenshot({path:'/tmp/potato-brand-finish-390.png'});
  await page.getByRole('button',{name:'Condividi risultato',exact:true}).scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'Condividi risultato',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.social-dialog img')?.naturalWidth===1080);
  assert.equal(await page.locator('.social-dialog img').evaluate(e=>e.naturalHeight),1920);
  await page.screenshot({path:'/tmp/potato-brand-share-390.png'});
  await page.locator('.social-dialog select').selectOption('square');
  await page.waitForFunction(()=>document.querySelector('.social-dialog img')?.naturalHeight===1080);
  await page.getByRole('button',{name:'Chiudi',exact:true}).click();
  await page.evaluate(()=>potatoUI.goHome());await page.setViewportSize({width:320,height:568});
  await page.screenshot({path:'/tmp/potato-brand-home-320.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{await browser.close()}
});
