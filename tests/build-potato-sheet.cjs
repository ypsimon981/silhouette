// Review asset made with the real SVG renderer; never changes player data.
const fs=require('node:fs'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://preview.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.localStorage.setItem('10shapes_profile_setup','yes');w.localStorage.setItem('10shapes_music','off');
w.fetch=()=>new Promise(()=>{});w.HTMLElement.prototype.scrollIntoView=()=>{};
w.eval(fs.readFileSync('social-config.js','utf8').replace('enabled: true','enabled: false'));w.eval(fs.readFileSync('social.js','utf8'));
let js=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
js=js.replace('})();','window.potatoSheet=(n,family,rotation=0)=>{level=n;return shape3D(shapeCatalog.find(s=>s.family===family&&s.rotation===rotation)).outerHTML};})();');
w.eval(js);
const cells=[];
for(let n=1;n<=4;n++)cells.push({n,f:'organic4-0',label:['Gialla','Pezzata','Rossa','Viola'][n-1]});
for(const [f,r,label] of [['circle',0,'Occhi 25% · bocca 30%'],['ring',0,'Ovale pieno'],['square-hole',0,'Cuscino pieno'],['ell',0,'L · bracci più spessi'],['ell',90,'L ruotata'],['semicircle',0,'Semicerchio'],['crescent',0,'Luna'],['triangle',90,'Triangolo ruotato']])cells.push({n:1,f,r,label});
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="990" viewBox="0 0 1200 990"><style>text{font-family:sans-serif;fill:#ffedbf}.front-face{stroke:#f7dba8;stroke-opacity:.5;stroke-width:.7}</style><rect width="1200" height="990" fill="#29232a"/><text x="36" y="45" font-size="26">10 POTATOES · v0.22.4</text>';
cells.forEach((c,i)=>{const x=(i%4)*300,y=70+Math.floor(i/4)*300;svg+='<rect x="'+(x+10)+'" y="'+y+'" width="280" height="285" rx="20" fill="#494738"/>'+w.potatoSheet(c.n,c.f,c.r).replace('<svg ','<svg x="'+(x+35)+'" y="'+(y+5)+'" width="230" height="230" ')+'<text x="'+(x+150)+'" y="'+(y+263)+'" text-anchor="middle" font-size="16">'+c.label+'</text>'});
svg+='</svg>';fs.writeFileSync('docs/potato-varieties.svg',svg);w.close();
