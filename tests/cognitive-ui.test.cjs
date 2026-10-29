// Real client, real private-profile SQL, fixture Auth/API only. No production requests.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{database,seed,call,who}=require('./cognitive-fixture.cjs');
async function placements(page,miss=false){
 await page.locator('#startButton').click();await page.waitForSelector('.piece:not(.done)');
 if(miss){const piece=page.locator('.piece:not(.done)'),r=await piece.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await piece.dispatchEvent('pointercancel',{pointerId:1});await page.mouse.up();}
 if(miss){const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('#board').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+2,b.y+2,{steps:3});await page.mouse.up();}
 for(let i=0;i<10;i++){const a=await page.locator('.piece:not(.done)').boundingBox(),b=await page.locator('.slot').nth(i).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:3});await page.mouse.up();}
}
test('mobile profile, real precision capture, three-stage unranked training, interruption, reload and daily limit',async()=>{
 const db=await database();await seed(db,who,12);let browser;
 const root=process.cwd(),server=http.createServer((req,res)=>{const p=path.resolve(root,new URL(req.url,'http://local').pathname.slice(1)||'index.html');try{if(!p.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(p))}catch{res.writeHead(404).end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer','--use-gl=disabled']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(id=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');localStorage.setItem('10potatoes_voices','off');localStorage.setItem('10shapes_player_id',id);localStorage.setItem('10shapes_nick','Ypsimon');localStorage.setItem('10shapes_social_session',JSON.stringify({user:{id},access_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600}));},who);
 await page.route(/^https:\/\//,async route=>{
  const req=route.request();if(!req.url().includes('supabase.co'))return route.abort();
  try{
   let result={};if(req.method()==='GET')result={scores:[],total:0,my_context:[]};else{
    const {action,data}=req.postDataJSON();
    if(action?.startsWith('cognitive_'))result=await call(db,action.slice(10),data);
    else if(action==='profile')result={preferences:{analytics:false}};
    else if(action==='ranking_changes')result={changes:[]};
    else if(action==='run_start'){const id=crypto.randomUUID();await db.query("insert into shapes_social_runs(id,user_id,level,status) values($1,$2,$3,'started')",[id,who,data.level]);result={id,level:data.level};}
    else if(action==='run_finish'){await db.query("update shapes_social_runs set status='completed',time_ms=$2 where id=$1",[data.id,data.time_ms]);}
    else if(action==='performance_sectors')result={world:[false,false,false]};
   }
   await route.fulfill({json:result,headers:{'access-control-allow-origin':'*'}});
  }catch(e){await route.fulfill({status:400,json:{error:e.message},headers:{'access-control-allow-origin':'*'}})}
 });
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('[data-section="cognitive"]').click();await page.waitForFunction(()=>document.querySelectorAll('.cognitiveScore')[1]?.textContent==='83/100');
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.getElementById('myProgress').scrollWidth>document.getElementById('myProgress').clientWidth),false);}
 fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/cognitive-personal.png'});
 assert.equal(await page.locator('.cognitiveMeasured circle').count(),2);assert.equal(await page.locator('.cognitiveScore').nth(0).innerText(),'—');
 await page.locator('[data-section="levels"]').click();await page.locator('[data-mode="1"]').click();await placements(page,true);
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('10potatoes_cognitive_v1:'+id)||'{}').records?.length===1,who);
 const measuredId=await page.evaluate(id=>JSON.parse(localStorage.getItem('10potatoes_cognitive_v1:'+id)).records.at(-1).id,who);
 let raw;for(let i=0;i<40;i++){raw=(await db.query('select releases,successes,outcome from shapes_cognitive_events where id=$1',[measuredId])).rows[0];if(raw)break;await new Promise(r=>setTimeout(r,50));}assert.ok(raw,'measurement reaches the server');assert.equal(raw.releases,11);assert.equal(raw.successes,10);assert.equal(raw.outcome,'completed');
 await page.locator('#finishHome').click();await page.locator('[data-section="cognitive"]').click();
 const recordKeys=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('silhouette_record_'))));
 const before=(await db.query('select count(*)::int n from shapes_cognitive_events')).rows[0].n;
 await page.locator('#cognitiveTraining button').click();
 for(let i=0;i<3;i++){await page.waitForFunction(n=>document.getElementById('levelTitle').textContent.includes('ADATTABILITÀ · '+n+'/3'),i+1);await placements(page);}
 await page.waitForFunction(()=>document.querySelector('.cognitiveTrialResult')?.textContent.startsWith('Ultima prova: 100/100'));
 assert.equal((await db.query('select count(*)::int n from shapes_cognitive_events')).rows[0].n,before);
 assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('silhouette_record_')))),recordKeys);
 assert.equal(await page.locator('.cognitiveScore').nth(3).innerText(),'100/100','first adaptability score appears immediately');
 assert.ok(await page.locator('#cognitiveTraining button').isDisabled());
 await page.locator('[data-section="levels"]').click();
 assert.match(await page.locator('#adaptabilityLaunch').innerText(),/Misurazione effettuata : 100/);
 assert.match(await page.locator('#adaptabilityLaunch small').innerText(),/Domani/);
 assert.ok(await page.locator('#adaptabilityLaunch').isDisabled());
 assert.equal(await page.locator('[data-mode="14"],[data-rank="14"],[data-stat="14"]').count(),0);
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  const boxes=await page.locator('.seriesModes button').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,width:r.width,y:r.y};}));
  assert.equal(boxes.length,5);assert.ok(boxes.every(b=>Math.abs(b.width-boxes[0].width)<1&&Math.abs(b.x-boxes[0].x)<1));
  assert.ok(boxes.every((b,i)=>!i||b.y>boxes[i-1].y));
 }
 await page.screenshot({path:'test-results/levels-daily-measurement.png'});
 // A new server day re-enables both entrances; restarting consumes that day's test.
 await db.exec("update shapes_cognitive_trials set day=day-1");
 await page.reload();await page.waitForFunction(()=>!document.getElementById('adaptabilityLaunch').disabled);
 await page.locator('#adaptabilityLaunch').click();await page.waitForFunction(()=>document.getElementById('levelTitle').textContent.startsWith('ADATTABILITÀ'));
 await page.locator('#restart').click();await page.locator('#homeButton').click();
 await page.waitForFunction(()=>document.getElementById('adaptabilityLaunch').textContent.includes('Misurazione effettuata : 0'));
 await page.reload();await page.waitForFunction(()=>document.getElementById('adaptabilityLaunch').textContent.includes('Misurazione effettuata : 0'));
 assert.ok(await page.locator('#adaptabilityLaunch').isDisabled());
 const statuses=(await db.query('select status from shapes_cognitive_trials order by started_at')).rows.map(r=>r.status);assert.deepEqual(statuses,['completed','failed']);
 assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>server.close(r));await db.close()}
});

