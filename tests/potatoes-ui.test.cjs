// Browser geometry and pointer regression; all network requests are local fixtures.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
const debug=`window.potatoUI={shapeCatalog,shape3D,shape,potatoPath,setLevel,play:()=>{phase="playing";start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove("stage-raised");board.classList.add("board-live");document.getElementById("countdown").style.display="none";next()},state:()=>({count,phase})};})();`;
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
test('all catalog contours contain unchanged eyes/mouth and match their seats at every rotation',async()=>{
 const {browser,page}=await fixture();try{
 const result=await page.evaluate(()=>{
  const errors=[];let total=0;
  for(const entry of potatoUI.shapeCatalog){
   const svg=potatoUI.shape3D(entry),slot=potatoUI.shape(entry);svg.style='position:fixed;width:100px;height:100px;left:0;top:0';document.body.append(svg);
   const path=svg.querySelector('.front-face'),inverse=path.getCTM().inverse();
   if(path.getAttribute('d')!==slot.querySelector('.recess-floor').getAttribute('d'))errors.push(entry.family+' seat mismatch');
   if((path.getAttribute('d').match(/M/g)||[]).length!==1)errors.push(entry.family+' hole');
   const inside=(node,p)=>path.isPointInFill(new DOMPoint(p.x,p.y).matrixTransform(node.getCTM()).matrixTransform(inverse));
   for(const eye of svg.querySelectorAll('.potatoEyeWhite'))for(let i=0;i<32;i++){
    const a=i*Math.PI/16;
    if(!inside(eye,{x:+eye.getAttribute('cx')+Math.cos(a)*+eye.getAttribute('rx'),y:+eye.getAttribute('cy')+Math.sin(a)*+eye.getAttribute('ry')}))errors.push(entry.family+' '+entry.rotation+' clipped eye');
   }
   const mouth=svg.querySelector('.potatoMouth > path'),length=mouth.getTotalLength();
   for(let i=0;i<40;i++)if(!inside(mouth,mouth.getPointAtLength(length*i/40)))errors.push(entry.family+' '+entry.rotation+' clipped mouth');
   const grain=svg.querySelector('pattern');if(grain.getAttribute('patternUnits')!=='userSpaceOnUse')errors.push('stretched grain');
   svg.remove();total++;
  }return {errors,total};
 });
 assert.deepEqual(result.errors,[]);assert.ok(result.total>100);
 }finally{await browser.close()}
});
test('ten levels retain ten slots and complete through real pointer placement on small phone, phone and tablet',async()=>{
 const {browser,page}=await fixture();try{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
  await page.setViewportSize(size);
  for(const mode of [1,2,4,7,8,9,10,11,12,13]){
   await page.evaluate(mode=>{potatoUI.setLevel(mode);potatoUI.play()},mode);
   assert.equal(await page.locator('.slot').count(),10);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   for(let i=0;i<10;i++){
    const piece=page.locator('.piece:not(.done)'),a=await piece.boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();
    await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:2});await page.mouse.up();
    assert.equal((await page.evaluate(()=>potatoUI.state())).count,i+1);
   }
   assert.equal((await page.evaluate(()=>potatoUI.state())).phase,'finished');
   assert.equal(await page.locator('.piece.done').count(),10);
  }
 }
 assert.deepEqual(errors,[]);
 }finally{await browser.close()}
});
