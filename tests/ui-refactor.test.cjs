// UI-only regression. All network data is a fixture; no production writes.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
async function server(){const s=http.createServer((req,res)=>{const f=path.resolve('.',new URL(req.url,'http://local').pathname.slice(1)||'index.html');if(!f.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.json')?'application/json':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}});await new Promise(r=>s.listen(0,'127.0.0.1',r));return {s,url:'http://127.0.0.1:'+s.address().port}}
async function play(page,beforeFinish){await page.locator('#startButton').click();await page.waitForTimeout(3100);for(let i=0;i<10;i++){if(i===9)beforeFinish?.();const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:3});await page.mouse.up()}await page.locator('#finish').waitFor({state:'visible'})}
test('four macrosections, direct levels, real completion, contextual return, retries, next and sharing at Android sizes',async()=>{
 const {s,url}=await server();let browser;
 try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 for(const viewport of [{width:320,height:568},{width:360,height:640},{width:412,height:915}]){
 const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')console.log(m.text())});
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10shapes_language','es')});
 let online=true,rank=4;
 await page.route(/^https:\/\//,async r=>{if(!r.request().url().includes('ten-shapes-ranking')||!online)return r.abort();const id=new URL(r.request().url()).searchParams.get('player_id');const scores=Array.from({length:7},(_,i)=>({player_id:i===rank-1?id:'fixture-'+i,nickname:'Giocatore '+(i+1),country:'IT',time_ms:10000+i*1000}));return r.fulfill({headers:{'access-control-allow-origin':'*'},json:{scores,total:7,my_rank:rank,my_score:scores[rank-1],leader:scores[0],my_context:[]}})});
 await page.goto(url);await page.waitForTimeout(100);
 const roots={levels:'#homePage',rankings:'#ranking',cognitive:'#myProgress',settings:'#profileOverlay'};
 const header=page.locator('#app > header'),nav=header.locator('.macroNavigation');
 const baselineHeight=(await header.boundingBox()).height;
 const baselineBackground=await header.evaluate(e=>getComputedStyle(e).backgroundImage);
 assert.match(baselineBackground,/jute-natural/);
 for(const [source,root] of Object.entries(roots)){
  if(source!=='levels')await nav.locator('[data-section="'+source+'"]').click();
  assert.ok(await page.locator(root).isVisible());
  assert.equal(await nav.locator('button:visible').count(),3);
  assert.equal(await nav.locator('[data-section="'+source+'"]').isVisible(),false);
  assert.ok(await header.isVisible());
  assert.ok(Math.abs((await header.boundingBox()).height-baselineHeight)<=1);
  assert.equal(await header.evaluate(e=>getComputedStyle(e).backgroundImage),baselineBackground);
  if(source==='settings')assert.equal(await page.locator('#closeProfile').isVisible(),false);
  for(const target of Object.keys(roots).filter(v=>v!==source)){
   await nav.locator('[data-section="'+target+'"]').click();assert.ok(await page.locator(roots[target]).isVisible());
   assert.equal(await nav.locator('button:visible').count(),3);
   await nav.locator('[data-section="'+source+'"]').click();
  }
  if(source!=='levels')await nav.locator('[data-section="levels"]').click();
 }
 assert.equal(await page.locator('#refresh').isVisible(),false);
 assert.equal(await page.locator('#trainingModes').isVisible(),false);
 assert.ok(await page.locator('[data-mode="14"]').isVisible());
 await page.locator('[data-mode="4"]').click();assert.match(await page.locator('#levelTitle').innerText(),/3/);
 assert.ok(await header.isVisible());
 assert.ok(Math.abs((await header.boundingBox()).height-baselineHeight)<=1);
 assert.equal(await nav.isVisible(),false);
 assert.equal(await page.locator('#adSlot').isVisible(),false);
 assert.ok(await page.locator('#handControls').isVisible());
 await play(page,()=>{rank=3});await page.waitForTimeout(200);
 assert.equal(await page.locator('#finishLevelName').innerText(),'Livello 3');
 assert.ok(await header.isVisible());
 assert.ok(Math.abs((await header.boundingBox()).height-baselineHeight)<=1);
 assert.equal(await page.locator('#finishSectors .sector').count(),3);
 assert.ok(await page.locator('#adSlot').isVisible());
 const snapshot=await page.locator('#finishScore').innerText();
 assert.match(snapshot,/La tua posizione: 3/);assert.equal(await page.locator('.resultRankRow').count(),5);assert.match(snapshot,/↑ \+1 posizione/);
 for(const pair of [['#finishRanking','#closeRanking'],['#finishProgress','#closeProgress']]){await page.locator(pair[0]).click();await page.locator(pair[1]).click();assert.equal(await page.locator('#finishScore').innerText(),snapshot)}
 const geometry=await page.evaluate(()=>{const f=document.getElementById('finish').getBoundingClientRect(),b=document.getElementById('board').getBoundingClientRect(),ad=document.getElementById('adSlot').getBoundingClientRect();return {f:{x:f.x,y:f.y,bottom:f.bottom,width:f.width},b:{x:b.x,y:b.y,bottom:b.bottom,width:b.width},adTop:ad.y,overflow:document.documentElement.scrollWidth>innerWidth}});
 assert.ok(geometry.f.width>=geometry.b.width*.9);assert.ok(geometry.f.bottom<=geometry.adTop+1);assert.equal(geometry.overflow,false);
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/ui-refactor-'+viewport.width+'.png'});await page.getByRole('button',{name:'Condividi risultato',exact:true}).click();await page.locator('.social-dialog img').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('.social-dialog img')?.naturalWidth===1080);await page.getByRole('button',{name:'Chiudi',exact:true}).click();
 await page.locator('#again').click();assert.ok(await page.locator('#startButton').isVisible());
 await play(page);await page.locator('#nextLevel').click();assert.match(await page.locator('#levelTitle').innerText(),/4/);assert.ok(await page.locator('#startButton').isVisible());
 await page.locator('#homeButton').click();
 await page.locator('[data-mode="1"]').click();
 await page.locator('#homeButton').click();
 await nav.locator('[data-section="settings"]').click();
 assert.ok(await page.locator('#profileOverlay').isVisible());
 assert.equal(await page.locator('#closeProfile').isVisible(),false);
 assert.equal(await page.locator('#board').evaluate(e=>e.classList.contains('game-screen')),false);
 await nav.locator('[data-section="levels"]').click();
 assert.ok(await page.locator('#homePage').isVisible());
 assert.equal(await page.locator('#finish').isVisible(),false);
 // Non-potato appearance and direct launch remain available.
 for(const [mode,css] of [[17,'level-animals'],[18,'level-flowers']]){await page.locator('[data-mode="'+mode+'"]').click();assert.ok(await page.locator('#board').evaluate((e,c)=>e.classList.contains(c),css));await page.locator('#homeButton').click()}
 online=false;await page.locator('[data-mode="1"]').click();await play(page);await page.waitForTimeout(50);assert.match(await page.locator('#recordPositions').innerText(),/temporaneamente non disponibile/);
 assert.deepEqual(errors,[]);await page.close();
 }
 }finally{await browser?.close();await new Promise(r=>s.close(r))}
});
