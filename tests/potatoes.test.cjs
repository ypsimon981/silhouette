const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function fixture(){
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=()=>new Promise(()=>{});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const debug='window.potatoTest={catalog:()=>shapeCatalog.map(entry=>({entry,slot:shape(entry),piece:shape3D(entry),rounded:potatoPath(entry)})),reset:setup,state:()=>({count,phase}),play:()=>{setLevel(1);phase="playing";start=performance.now();beginSectors();beginBehaviorAttempt();next()},drop:ok=>{const target={left:100,top:100,width:60,height:60};active.getBoundingClientRect=()=>ok?target:{left:0,top:0,width:60,height:60};slots[count].getBoundingClientRect=()=>target;offset={};up({})}};})();';
 w.eval([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1].replace('})();',debug));
 return {w,g:w.potatoTest,close:()=>w.close()};
}
test('every existing silhouette has identical softened potato/cutout geometry, preserved holes and upright faces without consuming gameplay randomness',()=>{
 const {w,g,close}=fixture();try{
  const random=w.Math.random;w.Math.random=()=>{throw Error('Cosmetic renderer consumed shape randomness')};
  const catalog=g.catalog();w.Math.random=random;assert.ok(catalog.length>40);
  const ids=new Set();
  for(const {entry,slot,piece,rounded} of catalog){
   assert.equal(slot.querySelector('.recess-floor').getAttribute('d'),piece.querySelector('.front-face').getAttribute('d'));
   assert.equal(piece.querySelector('.front-face').getAttribute('fill-rule'),'evenodd');
   assert.equal(slot.querySelector('.recess-floor').getAttribute('d'),rounded);
   assert.ok(!/NaN|Infinity/.test(rounded));
   assert.equal((rounded.match(/Z/gi)||[]).length,(entry.path.match(/Z/gi)||[]).length);
   assert.equal(piece.querySelector('.potatoFace').dataset.upright,'true');
   assert.ok(!piece.querySelector('.potatoFace').getAttribute('transform').includes('rotate'));
   assert.equal(piece.querySelectorAll('.potatoPupils ellipse').length,2);
   for(const def of piece.querySelectorAll('[id]')){assert.equal(ids.has(def.id),false);ids.add(def.id)}
  }
  const square=catalog.find(a=>a.entry.family==='square');assert.match(square.rounded,/ Q /);
  const ring=catalog.find(a=>a.entry.family==='ring');assert.equal(ring.rounded,ring.entry.path);
  assert.equal(w.SILHOUETTE_SOCIAL_CONFIG.brand,'10 Potatoes');assert.equal(w.document.title,'10 Potatoes');
 }finally{close()}
});
test('potato expressions react to rejected placement, reset safely, and all ten pieces still complete with existing timing rules',()=>{
 const {w,g,close}=fixture();try{
  g.play();const board=w.document.querySelector('#board');
  assert.equal(board.querySelectorAll('.potatoFace').length,1);g.drop(false);
  assert.equal(g.state().count,0);assert.equal(board.classList.contains('potato-oops'),true);
  g.reset();assert.equal(board.classList.contains('potato-oops'),false);
  g.play();for(let i=0;i<10;i++){g.drop(true);assert.equal(g.state().count,i+1)}
  assert.equal(g.state().phase,'finished');assert.equal(board.querySelectorAll('.piece.done').length,10);
  assert.equal(board.querySelectorAll('.piece.done .potatoFace').length,10);
  assert.equal(w.document.querySelector('#finishSectors').hidden,false);
  assert.ok([...board.querySelectorAll('.piece.done')].slice(0,9).every(p=>p.style.getPropertyValue('--look-x')));
  assert.match(w.document.querySelector('style').textContent,/@media\(prefers-reduced-motion:reduce\).*potatoEyes/s);
 }finally{close()}
});
