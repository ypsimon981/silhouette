const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const debug=`window.shadowGameTest={catalog:shapeCatalog,shape3D,setLevel,begin,state:()=>({phase,count}),play:()=>{phase='playing';start=performance.now();beginSectors();beginBehaviorAttempt();board.classList.remove('stage-raised');board.classList.add('board-live');document.getElementById('countdown').style.display='none';document.getElementById('preGameIdentity').hidden=true;next();}};`;
async function fixture(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||(fs.existsSync('/workspace/scratch/e0742c94b4af/browser-runtime/chromium')?'/workspace/scratch/e0742c94b4af/browser-runtime/chromium':undefined),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());if(url.hostname!=='shadow.test')return route.request().resourceType()==='script'?route.fulfill({body:'',contentType:'application/javascript'}):route.fulfill({json:{scores:[],total:0}});const name=url.pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({json:{scores:[],total:0}});let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('applyLanguage();setup();goHome();',debug+'applyLanguage();setup();goHome();'));if(name==='social-config.js')data=Buffer.from(data.toString().replace('enabled: true','enabled: false'));const type={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream';return route.fulfill({body:data,contentType:type});});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');});await page.goto('https://shadow.test/');try{await page.waitForFunction(()=>!!window.shadowGameTest&&!!window.PotatoShadows,null,{timeout:10000});}catch(e){console.error('Page errors:',errors);await browser.close();throw e;}return {browser,page,errors};
}

test('flour preserves exact potato openings, deterministic cache and untouched animal/flower targets',async()=>{
 const {browser,page,errors}=await fixture();try{
  const result=await page.evaluate(async()=>{
   shadowGameTest.setLevel(1);shadowGameTest.play();
   const slots=[...document.querySelectorAll('.slot')];
   if(!slots.every(s=>s.querySelector('.flour-slot')))throw Error('Missing flour targets');
   const selected=slots[0].querySelector('.recess-floor'),d=selected.getAttribute('d');
   const old=Math.random;Math.random=()=>{throw Error('Cosmetic RNG')};
   const a=PotatoFlour.create(d,0),b=PotatoFlour.create(d,90);Math.random=old;
   if(a.querySelector('image').getAttribute('href')!==b.querySelector('image').getAttribute('href'))throw Error('Cache not reused');
   const image=new Image();image.src=a.querySelector('image').getAttribute('href');await image.decode();
   const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,512,512).data,hit=document.createElement('canvas').getContext('2d'),path=new Path2D(d);
   hit.lineWidth=1.7;let interior=0,occupied=0,leaks=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const px=(x+.5)*120/512-10,py=(y+.5)*120/512-10,alpha=pixels[(y*512+x)*4+3];
    if(alpha)occupied++;
    if(hit.isPointInPath(path,px,py,'evenodd')&&!hit.isPointInStroke(path,px,py)){interior++;if(alpha)leaks++;}
   }
   if(interior<1000||occupied<1000||leaks)throw Error('Opening not transparent: '+leaks);
   if(getComputedStyle(selected).filter!=='none'||getComputedStyle(selected).fill!=='none')throw Error('Interior still shaded');
   let potatoShapes=0;
   for(const entry of shadowGameTest.catalog.filter(e=>!e.animal&&!e.flower)){
    const d=shadowGameTest.shape3D(entry).querySelector('.front-face').getAttribute('d');
    const slot=PotatoFlour.create(d,entry.rotation);
    if(slot.querySelector('.recess-floor').getAttribute('d')!==d||slot.querySelector('g').getAttribute('transform')!=='rotate('+entry.rotation+' 50 50)')throw Error('Shape geometry changed');
    potatoShapes++;
   }
   if(potatoShapes<40)throw Error('Incomplete potato catalog');
   for(const mode of [17,18]){shadowGameTest.setLevel(mode);if(document.querySelector('.flour-slot'))throw Error('Flour leaked to non-potato mode');if(document.querySelectorAll('.slot .recess-rim').length!==10)throw Error('Original targets missing');}
   shadowGameTest.setLevel(1);shadowGameTest.play();
   return {interior,occupied,leaks,potatoShapes};
  });
  assert.equal(result.leaks,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:'/workspace/scratch/e0742c94b4af/flour-targets-mobile.png'});
 }finally{await browser.close();}
});
