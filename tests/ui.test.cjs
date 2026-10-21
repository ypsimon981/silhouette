// All external HTTP is intercepted. Test fixtures are never production data.
const {test}=require('node:test');const assert=require('node:assert/strict');
const {chromium}=require('playwright');const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
async function launch(){
 if(process.env.CHROMIUM_EXECUTABLE)return chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--no-zygote','--single-process','--disable-gpu']});
 return chromium.launch({headless:true});
}
async function server(){const s=http.createServer((req,res)=>{const name=new URL(req.url,'http://local').pathname;const f=path.resolve('.',name==='/'?'index.html':'.'+name);if(!f.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}try{const data=fs.readFileSync(f);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(data);}catch{res.writeHead(404).end();}});await new Promise(r=>s.listen(0,'127.0.0.1',r));return {s,url:'http://127.0.0.1:'+s.address().port};}
async function play(page){
 await page.locator('#startButton').click();await page.waitForTimeout(3200);
 for(let i=0;i<10;i++){
  const piece=page.locator('.piece:not(.done)'),slot=page.locator('.slot').nth(i);const a=await piece.boundingBox(),b=await slot.boundingBox();
  assert.ok(a&&b);await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:3});await page.mouse.up();
 }
 await page.locator('#social-actions').waitFor({state:'visible'});
}
test('mobile/tablet play regression, random retries, card exports, safe layout and offline behavior',async()=>{
 const {s,url}=await server();let browser;
 try{browser=await launch();
  for(const size of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
   const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');});
   await page.route('https://**',r=>r.abort());await page.goto(url);
   assert.equal(await page.locator('#social-actions').isVisible(),false);
   await page.locator('[data-mode="1"]').click();const first=await page.locator('.slot').evaluateAll(es=>es.map(e=>e.innerHTML+e.style.left+e.style.top).join('|'));
   await play(page);await page.getByRole('button',{name:'Condividi risultato',exact:true}).click();
   await page.locator('.social-dialog img').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('.social-dialog img')?.naturalWidth===1080);
   assert.equal(await page.locator('.social-dialog img').evaluate(e=>e.naturalHeight),1920);
   await page.locator('.social-dialog select').selectOption('square');await page.waitForFunction(()=>document.querySelector('.social-dialog img')?.naturalHeight===1080);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.getByRole('button',{name:'Chiudi',exact:true}).click();await page.locator('#again').click();
   const second=await page.locator('.slot').evaluateAll(es=>es.map(e=>e.innerHTML+e.style.left+e.style.top).join('|'));assert.notEqual(first,second);
   assert.equal(await page.locator('#social-actions').isVisible(),false);
   await page.locator('#homeButton').click();await page.locator('#profileButton').click();
   assert.ok(await page.locator('#social-preferences').count());assert.match(await page.locator('#social-preferences').innerText(),/Push non disponibili/);
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser?.close();await new Promise(r=>s.close(r));}
});
test('cold/warm challenge links, save for later, authenticated request and pending start cancellation',async()=>{
 const {s,url}=await server();let browser;
 try{browser=await launch();const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const code='b'.repeat(32),requests=[];
  await page.addInitScript(()=>{localStorage.setItem('10shapes_profile_setup','yes');localStorage.setItem('10shapes_music','off');});
  await page.route('**/social-config.js',r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync('social-config.js','utf8').replace('enabled: false','enabled: true')}));
  await page.route('https://**',async r=>{
   const u=r.request().url();if(u.includes('/auth/v1/signup'))return r.fulfill({json:{access_token:'TEST_ONLY',refresh_token:'TEST_REFRESH',expires_at:9999999999,user:{id:'00000000-0000-4000-8000-000000000001'}}});
   if(u.includes('/ten-shapes-social')){const b=r.request().postDataJSON();requests.push(b);assert.equal(r.request().headers().authorization,'Bearer TEST_ONLY');
    const response=b.action==='profile'?{preferences:{challenges:true,digest:true,digest_time:'19:00',show_name:true,analytics:false}}:
     b.action==='challenge_get'?{code,level:9,time_ms:18420,nickname:'Amico <script>test</script>'}:
     b.action==='run_start'?{id:'test-run'}:b.action==='run_finish'?{saved:true,outcome:'won',difference_ms:-470,achievements:[],rank:1,total:10}:{};
    return r.fulfill({json:response});}
   return r.fulfill({json:{scores:[],total:0,my_rank:null}});
  });
  await page.goto(url+'/#c/'+code);await page.getByRole('button',{name:'GIOCA PIÙ TARDI'}).click();
  assert.ok((await page.evaluate(()=>localStorage.getItem('10shapes_social_pending'))).includes(code));
  await page.evaluate(c=>{location.hash='';location.hash='c/'+c;},code);
  await page.getByRole('button',{name:'ACCETTA LA SFIDA'}).click();assert.match(await page.locator('#levelTitle').innerText(),/LIVELLO 6/);
  await play(page);assert.ok(requests.some(x=>x.action==='run_start'&&x.data.code===code&&x.data.level===9));
  await page.waitForFunction(()=>document.querySelector('#social-result').textContent.includes('HAI VINTO'));
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(r=>s.close(r));}
});
