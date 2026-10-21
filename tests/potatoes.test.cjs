const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function fixture(){
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://game.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
 w.fetch=()=>new Promise(()=>{});w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(fs.readFileSync('social-config.js','utf8'));w.eval(fs.readFileSync('social.js','utf8'));
 const debug='window.potatoTest={catalog:()=>shapeCatalog.map(entry=>({entry,slot:shape(entry),piece:shape3D(entry),rounded:potatoPath(entry)})),variety:n=>{level=n;showLevelTheme();return {skin:potatoVariety(),pieces:shapeCatalog.slice(0,10).map(shape3D),tint:board.style.getPropertyValue("--stage-tint"),neon:board.style.getPropertyValue("--potato-neon")}},reset:setup,state:()=>({count,phase}),play:()=>{setLevel(1);phase="playing";start=performance.now();beginSectors();beginBehaviorAttempt();next()},drop:ok=>{const target={left:100,top:100,width:60,height:60};active.getBoundingClientRect=()=>ok?target:{left:0,top:0,width:60,height:60};slots[count].getBoundingClientRect=()=>target;offset={};up({})}};})();';
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
  const ring=catalog.find(a=>a.entry.family==='ring');assert.match(ring.rounded,/A 6 6/);assert.match(ring.rounded,/A 40 40/);
  const hollow=catalog.find(a=>a.entry.family==='square-hole');assert.ok(!hollow.rounded.includes('30 30'));
  const ell=catalog.find(a=>a.entry.family==='ell');assert.notEqual(ell.rounded,ell.entry.path);
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
test('four reference skins stay fixed within each level and match background/neon; eyes and mouth use reference proportions',()=>{
 const {w,g,close}=fixture();try{
  const names=['gialla','pezzata','rossa','viola'];
  for(let n=1;n<=10;n++){
   const v=g.variety(n);assert.equal(v.skin.name,names[(n-1)%4]);
   assert.equal(v.tint,v.skin.tint);assert.equal(v.neon,v.skin.neon);
   for(const piece of v.pieces){
    assert.equal(piece.dataset.variety,v.skin.name);
    assert.equal(piece.querySelectorAll('.potatoPatch').length,v.skin.name==='pezzata'?3:0);
    assert.equal(piece.querySelectorAll('.potatoEyeWhite').length,2);
    assert.equal(piece.querySelectorAll('.potatoMouth g path').length,4);
    const host=w.document.createElement('div');host.className='piece';host.appendChild(piece);w.document.querySelector('#board').appendChild(host);
    assert.equal(w.getComputedStyle(piece.querySelector('.potatoMouth > path')).fill,'rgb(67, 13, 11)');
    for(const patch of piece.querySelectorAll('.potatoPatch'))assert.match(w.getComputedStyle(patch).fill,/-patch["']?\)/);
    host.remove();
   }
  }
  const circle=g.variety(1).pieces[0];
  assert.equal(Number(circle.querySelector('.potatoEyeWhite').getAttribute('ry'))*2,25);
  // Cubic control height 40 gives exactly 30 at its midpoint (t = .5).
  assert.match(circle.querySelector('.potatoMouth > path').getAttribute('d'),/C 19 40 -19 40 -19 0/);
 }finally{close()}
});
