const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('Shells has sixteen distinct aligned cutouts, ten unique draws, local records and direct analysis launch',async()=>{
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://ypsimon981.github.io/silhouette/?level=shells',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');w.fetch=()=>new Promise(()=>{});w.HTMLElement.prototype.scrollIntoView=()=>{};
 try{
 for(const name of ['social-config.js','social.js','shells-catalog.js'])w.eval(fs.readFileSync(name,'utf8'));
 assert.equal(w.ShellCatalog.length,16);assert.equal(new Set(w.ShellCatalog.map(s=>s.path)).size,16);
 for(const shell of w.ShellCatalog){assert.ok(fs.existsSync(shell.image));assert.equal(shell.imageBox.length,4);assert(shell.imageBox.every(Number.isFinite));}
 let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
 script=script.replace('})();','window.__shells={setLevel,shape3D,paths,modeFromLevel,selectShapes,recordKey,ids:()=>ids,win:()=>{elapsed=20420;count=10;finishLevel(true)}};})();');
 w.eval(script);assert.equal(w.__shells.modeFromLevel(19),19);assert.match(w.document.querySelector('#levelTitle').textContent,/CONCHIGLIE|SHELLS/);
 assert.equal(w.document.querySelectorAll('.slot').length,10);assert.equal(new Set(w.__shells.ids()).size,10);
 for(const id of w.__shells.ids()){const shell=w.__shells.paths[id];assert.equal(shell.shell,true);const svg=w.__shells.shape3D(shell),image=svg.querySelector('image');assert.equal(image.getAttribute('href'),shell.image);assert.equal(svg.querySelector('clipPath path').getAttribute('d'),shell.path);for(const [i,key] of ['x','y','width','height'].entries())assert.equal(Number(image.getAttribute(key)),shell.imageBox[i]);}
 const draws=new Set();for(let i=0;i<12;i++){const draw=w.__shells.selectShapes();assert.equal(new Set(draw).size,10);draws.add(draw.slice().sort().join(','));}assert(draws.size>1);
 w.__shells.win();assert(w.localStorage.getItem(w.__shells.recordKey()));
 w.document.querySelector('[data-stat="19"]').click();assert.match(w.document.querySelector('#playAnalyzedLevel').textContent,/Conchiglie|Shells/);w.document.querySelector('#playAnalyzedLevel').click();assert(w.document.querySelector('#board').classList.contains('level-shells'));
 w.__shells.setLevel(1);assert(!w.document.querySelector('#board').classList.contains('level-shells'));
 }finally{await new Promise(r=>setTimeout(r,25));w.close()}
});
