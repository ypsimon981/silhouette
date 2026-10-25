const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('Flowers is a complete official level with ten unique silhouettes, reveal, records and analysis',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://ypsimon981.github.io/silhouette/?level=flowers',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_language','it');
 w.fetch=async()=>{throw Error('offline fixture')};w.HTMLElement.prototype.scrollIntoView=()=>{};
 try{
  for(const file of ['social-config.js','social.js','flowers-catalog.js'])w.eval(fs.readFileSync(file,'utf8'));
  assert.equal(w.FlowerCatalog.length,25);assert.equal(new Set(w.FlowerCatalog.map(f=>f.id)).size,25);
  for(const flower of w.FlowerCatalog){assert.ok(fs.existsSync(flower.image));assert.match(flower.path,/^M/);}
  let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
  script=script.replace('})();','window.__flowers={setLevel,shape3D,paths,ids:()=>ids,modeFromLevel,selectShapes,recordKey,win:()=>{elapsed=18420;count=10;finishLevel(true)}};})();');
  w.eval(script);
  assert.equal(w.__flowers.modeFromLevel(18),18);
  assert.match(w.document.querySelector('#levelTitle').textContent,/FIORI|FLOWERS/);
  assert.equal(w.document.querySelectorAll('.slot').length,10);
  const ids=w.__flowers.ids();assert.equal(new Set(ids).size,10);
  for(const id of ids){const f=w.__flowers.paths[id];assert.equal(f.flower,true);const svg=w.__flowers.shape3D(f);assert.equal(svg.querySelector('image').getAttribute('href'),f.image);assert.equal(svg.querySelector('clipPath path').getAttribute('d'),f.path);}
  assert.equal(new Set(w.__flowers.selectShapes()).size,10);
  w.__flowers.win();
  assert.ok(w.localStorage.getItem(w.__flowers.recordKey()));
  w.document.querySelector('[data-stat="18"]').click();assert.match(w.document.querySelector('#playAnalyzedLevel').textContent,/Fiori|Flowers/);
  w.document.querySelector('#playAnalyzedLevel').click();assert.equal(w.document.querySelectorAll('.slot').length,10);
  w.__flowers.setLevel(1);assert.equal(w.document.querySelectorAll('.slot').length,10);
 }finally{await new Promise(resolve=>setTimeout(resolve,25));w.close()}
});
