const fs=require('fs'),{chromium}=require('playwright');
(async()=>{
 const base=JSON.parse(fs.readFileSync('assets/potato-photo/manifest.json')).slice(0,11),all=JSON.parse(fs.readFileSync('tools/potato-photo/all-shapes.json'));
 const sources=['circle','ring','square-hole','star-1','star-2','triangle','square'].map(name=>{const s=base.find(e=>e.name===name);return {...s,data:'data:image/webp;base64,'+fs.readFileSync(s.url).toString('base64')};});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/workspace/scratch/e0742c94b4af/browser-runtime/chromium',args:['--no-sandbox']});
 const page=await browser.newPage();await page.addScriptTag({path:'tools/potato-photo/render-core.js'});await page.evaluate(s=>initPotatoRenderer(s),sources);
 fs.mkdirSync('tools/potato-photo/rendered',{recursive:true});const result=[];
 for(const shape of all.filter(s=>!base.some(b=>b.raw===s.raw))){
  const image=await page.evaluate(s=>renderPotato(s),shape),name=shape.family;
  fs.writeFileSync('tools/potato-photo/rendered/'+name+'.png',Buffer.from(image.data,'base64'));
  result.push({...shape,name,url:'./assets/potato-photo/'+name+'.webp',bounds:[0,0,100,100],material:image.material,phase:image.phase,method:'offline radial UV projection from approved photographed potato surface'});console.log(name);
 }
 fs.writeFileSync('tools/potato-photo/advanced-manifest.json',JSON.stringify(result,null,2));await browser.close();
})();
