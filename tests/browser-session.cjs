// Run with a local HTTP server; requires Playwright and its Chromium browser.
// BROWSER_EXECUTABLE can select a preinstalled Chromium; SESSION_SECONDS=600.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off')});
 // Isolate all external services, including score writes, from production.
 await page.route('https://**/*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({scores:[],total:0,my_rank:null,my_context:[],percentiles:{}})}));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:8765/?adtest=1');
 assert.equal(await page.evaluate(()=>typeof timeshapesAdTest),'object');
 const start=Date.now(),duration=Number(process.env.SESSION_SECONDS||600)*1000;
 let games=0,checks=0;
 const pause=ms=>page.waitForTimeout(ms);
 async function noAd(){assert.equal(await page.locator('#adSlot').isVisible(),false);assert.equal(await page.locator('#adtestHud').isVisible(),false);checks++}
 async function solve(){
  for(let i=0;i<10;i++){
   await pause(1800+(i%3)*300);
   const points=await page.evaluate(()=>{
    const piece=document.querySelector('.piece:not(.done)');if(!piece)return null;
    const d=piece.querySelector('clipPath path').getAttribute('d');
    const slot=[...document.querySelectorAll('.slot:not(.done)')].find(s=>[...s.querySelectorAll('path')].some(p=>p.getAttribute('d')===d));
    if(!slot)return null;const a=piece.getBoundingClientRect(),b=slot.getBoundingClientRect();return [a.x+a.width/2,a.y+a.height/2,b.x+b.width/2,b.y+b.height/2];
   });
   assert.ok(points,'matching silhouette');await page.mouse.move(points[0],points[1]);await page.mouse.down();await page.mouse.move(points[2],points[3],{steps:8});await page.mouse.up();
  }
 }
 await pause(5000);
 while(Date.now()-start<duration-60000){
  await page.locator(`[data-mode="${games%2?2:1}"]`).click();await noAd();
  await page.locator('#startButton').click();await noAd();await pause(3200);await noAd();
  await solve();await page.locator('#board.complete').waitFor();await noAd();games++;
  await pause(2500);await page.locator('#finishRanking').click();await pause(5000);
  if(games%2===0){await page.locator('[data-scope="national"]').click();await pause(3500)}
  await page.locator('#rankingToStats').click();await pause(6000);
  if(games%3===0){await page.locator('[data-stat="2"]').click();await pause(3000)}
  await page.locator('#homeButton').click();await pause(5000);
  console.log(JSON.stringify({games,elapsed:Math.round((Date.now()-start)/1000),qualified:await page.evaluate(()=>timeshapesAdTest.report().qualifiedOpportunities)}));
 }
 // Leave the final time for a ranking/performance comparison, then home.
 await page.locator('#homeRanking').click();await pause(5000);
 await page.locator('[data-rank="2"]').click();await pause(5000);
 await page.locator('#rankingToStats').click();await pause(5000);
 await page.locator('#homeButton').click();
 await pause(Math.max(1100,duration-(Date.now()-start)));
 const report=await page.evaluate(()=>timeshapesAdTest.stop());
 assert.equal(report.gamesCompleted,games);assert.equal(report.native.impression,0);assert.deepEqual(errors,[]);
 report.testMetadata={kind:'automated browser, real wall time, synthetic user behavior',browser:browser.version(),viewport:'390x844',externalServices:'mocked; no production score writes',games,gameplayBannerAbsenceChecks:checks,errors};
 fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/browser-session.json',JSON.stringify(report,null,2));
 console.log('RESULT',JSON.stringify({...report,events:undefined,byContext:undefined}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
