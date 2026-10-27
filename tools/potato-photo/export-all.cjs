const fs=require('fs');
const s=fs.readFileSync('index.html','utf8'),catalog=s.slice(s.indexOf('const quarterTurns='),s.indexOf('const animalShapeIds=')),round=s.slice(s.indexOf('const potatoOutlineCache='),s.indexOf('let potatoReactionTimer'));
const shapes=new Function(catalog+round+';return shapeCatalog.map(s=>({...s,raw:s.path,path:potatoPath(s)}));')();
const unique=[...new Map(shapes.map(s=>[s.raw,s])).values()];
fs.writeFileSync('tools/potato-photo/all-shapes.json',JSON.stringify(unique,null,2));console.log(unique.length,'outlines;',shapes.length,'variants');
