/* Approved isolated potato study, revision 17. No game-state access. */
(function(){
function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
const smooth=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*t;
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy)}
let seed=12171;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const spots=[],grid=Array.from({length:400},()=>[]);
// Spots live on a spherical surface: they compress radially towards the contour.
for(let i=0;i<360;i++){
 const type=i<216?'small':i<324?'medium':'large';
 const r=type==='small'?.0015+rand()*.004:type==='medium'?.007+rand()*.006:.016+rand()*.009;
 let x,y;
 do{const longitude=(rand()-.5)*Math.PI,latitude=Math.asin((rand()-.5)*1.88);x=.5+.445*Math.cos(latitude)*Math.sin(longitude);y=.49+.45*Math.sin(latitude);}while(type!=='small'&&x>.18-r*2&&x<.77+r*2&&y>.25-r*2&&y<.65+r*2);
 const dx=(x-.5)/.445,dy=(y-.49)/.45,z=Math.sqrt(Math.max(.015,1-dx*dx-dy*dy));
 const s={x,y,r,aspect:1/Math.max(.18,z),angle:Math.atan2(dy,dx),opacity:.22+rand()*.48,tone:rand()};spots.push(s);
 const range=r*s.aspect*1.9;
 for(let gy=Math.max(0,Math.floor((y-range)*20));gy<=Math.min(19,Math.floor((y+range)*20));gy++)for(let gx=Math.max(0,Math.floor((x-range)*20));gx<=Math.min(19,Math.floor((x+range)*20));gx++)grid[gy*20+gx].push(s);
}

let texturePixels=null;
function renderPotato(size){const data=new Uint8ClampedArray(size*size*4);const light=[-.32,-.72,.615];
for(let py=0;py<size;py++)for(let px=0;px<size;px++){
 const u=(px+.5)/size,v=(py+.5)/size,dx=(u-.5)/.445,dy=(v-.49)/.45,angle=Math.atan2(dy,dx);
 const contour=1+.014*Math.cos(3*angle+.8)+.012*Math.sin(5*angle+.5)+.008*Math.sin(7*angle),xn=dx/contour,yn=dy/contour,r2=Math.min(.999,xn*xn+yn*yn);
 const z=Math.sqrt(1-r2),lambert=Math.max(0,xn*light[0]+yn*light[1]+z*light[2]);
 const cloud=(noise(u*7+5,v*7+12)-.5)*.09+(noise(u*21,v*21)-.5)*.045;
 const grain=(noise(u*270,v*270)-.5)*3.8+(hash(px,py)-.5)*2.8;
 const edgeWeight=Math.pow(1-z,4.1);
 // One upper-left light: broad illuminated face, falloff towards the lower-right rim.
 const intensity=Math.min(1,Math.max(0,.47+.53*Math.pow(lambert,.55)-edgeWeight*.18+cloud));
 let color;const shadow=[190,48,38],mid=[251,166,34],lit=[255,232,137];
 if(intensity<.58)color=shadow.map((n,i)=>mix(n,mid[i],Math.pow(intensity/.58,.7)));else color=mid.map((n,i)=>mix(n,lit[i],Math.pow((intensity-.58)/.42,.9)));
 // Soft translucent pigment sits below tiny surface pores.
 let pigmentation=0;const cell=grid[Math.min(19,Math.floor(v*20))*20+Math.min(19,Math.floor(u*20))];
 for(const s of cell){const sx=(u-s.x)/s.r,sy=(v-s.y)/s.r,cs=Math.cos(s.angle),sn=Math.sin(s.angle),a=(sx*cs+sy*sn)*s.aspect,b=(-sx*sn+sy*cs);const rr=Math.sqrt(a*a+b*b);if(rr>1.7)continue;const irregular=(noise(u*420+s.x*50,v*420+s.y*50)-.5)*.32;const edge=rr+irregular;const core=Math.max(0,1-edge);pigmentation+=Math.pow(core,.65)*s.opacity;}
 pigmentation=Math.min(.7,pigmentation);const spot=[163+noise(u*18+5,v*18)*27,43+noise(u*34,v*34)*31,25+noise(u*27,v*27+9)*12];color=color.map((n,i)=>mix(n,spot[i]*(.72+.28*lambert),pigmentation));
 const pore=Math.max(0,noise(u*160+100,v*160+20)-.76)*18;
 const spec=Math.pow(Math.max(0,xn*-.17+yn*-.40+z*.9),28)*.08;
 const lift=1+.15*smooth(Math.max(0,Math.min(1,(intensity-.65)/.35)));
 color=color.map((n,i)=>Math.min(255,mix(n+grain-pore,[255,249,214][i],spec)*lift));
 const lowerShade=smooth(Math.max(0,Math.min(1,(v-.63)/.31)))*.65;
 color=color.map((n,i)=>mix(n,[153,33,31][i],lowerShade));
 const edgeShade=Math.pow(1-z,9)*.19;color=color.map((n,i)=>mix(n,[165,37,31][i],edgeShade));
 const redVariation=noise(u*9+41,v*9+17)*.18+noise(u*24+13,v*24+32)*.10;
 const warmMask=.65+.35*smooth(Math.max(0,Math.min(1,(v-.25)/.65)));
 color=color.map((n,i)=>mix(n,[205,79,52][i],.075+redVariation*warmMask));
 const luminance=color[0]*.2126+color[1]*.7152+color[2]*.0722;
 color=color.map(n=>mix(n,luminance,.18));
if(texturePixels){
 const tu=.5+Math.atan2(xn,z)/Math.PI*.76,tv=.5+Math.asin(Math.max(-1,Math.min(1,yn)))/Math.PI*.82;
 const tx=Math.min(639,Math.max(0,Math.floor(tu*640))),ty=Math.min(639,Math.max(0,Math.floor(tv*640))),ti=(ty*640+tx)*4;
 const illumination=.66+.43*lambert;
 color=[texturePixels[ti],texturePixels[ti+1],texturePixels[ti+2]].map(n=>Math.min(255,n*illumination));
 const lower=smooth(Math.max(0,Math.min(1,(v-.63)/.31)))*.32;
 color=color.map((n,i)=>mix(n,[133,40,24][i],lower));
 }
 const idx=(py*size+px)*4;data[idx]=color[0];data[idx+1]=color[1];data[idx+2]=color[2];data[idx+3]=255;
}return data}

let cached;function texture(){if(cached)return cached;const c=document.createElement("canvas");c.width=c.height=384;const ctx=c.getContext("2d"),im=ctx.createImageData(384,384);im.data.set(renderPotato(384));ctx.putImageData(im,0,0);return cached=c.toDataURL("image/png")}
const peelImage=new Image();peelImage.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=canvas.height=640;const ctx=canvas.getContext('2d');ctx.drawImage(peelImage,0,0,640,640);texturePixels=ctx.getImageData(0,0,640,640).data;cached=null;const material=texture();document.querySelectorAll('svg.potato-piece pattern image').forEach(image=>image.setAttribute('href',material))}catch(e){}};peelImage.src='./assets/brand/potato-peel-approved.webp?v=0.22.24';
window.ApprovedPotato={texture,face:"<defs>\n<radialGradient id=\"study-white\" cx=\"32%\" cy=\"16%\" r=\"78%\"><stop stop-color=\"#fff\"/><stop offset=\".7\" stop-color=\"#fffdf9\"/><stop offset=\"1\" stop-color=\"#eaded0\"/></radialGradient>\n<radialGradient id=\"study-iris\" cx=\"46%\" cy=\"38%\" r=\"70%\"><stop stop-color=\"#1e0c08\"/><stop offset=\".64\" stop-color=\"#42180e\"/><stop offset=\".84\" stop-color=\"#8e4b26\"/><stop offset=\"1\" stop-color=\"#34150c\"/></radialGradient>\n<linearGradient id=\"study-brow\" x1=\".2\" y1=\"0\" x2=\".7\" y2=\"1\"><stop stop-color=\"#a36334\"/><stop offset=\"1\" stop-color=\"#633018\"/></linearGradient>\n<linearGradient id=\"study-mouth\" x1=\".25\" y1=\"0\" x2=\".65\" y2=\"1\"><stop stop-color=\"#281009\"/><stop offset=\".5\" stop-color=\"#581b12\"/><stop offset=\"1\" stop-color=\"#883322\"/></linearGradient>\n<filter id=\"study-socket\" x=\"-35%\" y=\"-35%\" width=\"170%\" height=\"170%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"5\" result=\"blur\"/><feOffset in=\"blur\" dx=\"3\" dy=\"7\" result=\"off\"/><feComposite in=\"SourceAlpha\" in2=\"off\" operator=\"out\" result=\"edge\"/><feFlood flood-color=\"#4b200e\" flood-opacity=\".96\"/><feComposite in2=\"edge\" operator=\"in\" result=\"shade\"/><feComposite in=\"shade\" in2=\"SourceGraphic\" operator=\"over\" result=\"sunken\"/><feOffset in=\"blur\" dx=\"-2\" dy=\"-5\" result=\"bounce\"/><feComposite in=\"SourceAlpha\" in2=\"bounce\" operator=\"out\" result=\"rim\"/><feFlood flood-color=\"#ffe5a1\" flood-opacity=\".5\"/><feComposite in2=\"rim\" operator=\"in\"/><feComposite in2=\"sunken\" operator=\"over\"/></filter><filter id=\"study-eye-polish\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"5.6\" result=\"soft\"/><feOffset in=\"soft\" dx=\"3\" dy=\"9\" result=\"off\"/><feComposite in=\"SourceAlpha\" in2=\"off\" operator=\"out\" result=\"edge\"/><feFlood flood-color=\"#703a22\" flood-opacity=\".88\"/><feComposite in2=\"edge\" operator=\"in\" result=\"shade\"/><feComposite in=\"shade\" in2=\"SourceGraphic\" operator=\"over\" result=\"inset\"/><feOffset in=\"soft\" dx=\"-1.8\" dy=\"-4.5\" result=\"bounce\"/><feComposite in=\"SourceAlpha\" in2=\"bounce\" operator=\"out\" result=\"rim\"/><feFlood flood-color=\"#fff0c6\" flood-opacity=\".68\"/><feComposite in2=\"rim\" operator=\"in\"/><feComposite in2=\"inset\" operator=\"over\"/></filter><filter id=\"study-mouth-cut\" x=\"-20%\" y=\"-30%\" width=\"140%\" height=\"160%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"2.2\" result=\"soft\"/><feOffset in=\"soft\" dx=\"2\" dy=\"6\" result=\"off\"/><feComposite in=\"SourceAlpha\" in2=\"off\" operator=\"out\" result=\"edge\"/><feFlood flood-color=\"#180703\" flood-opacity=\".95\"/><feComposite in2=\"edge\" operator=\"in\"/><feComposite in2=\"SourceGraphic\" operator=\"over\"/></filter><filter id=\"study-soft\"><feGaussianBlur stdDeviation=\"1.8\"/></filter>\n</defs>\n<g class=\"brows potatoBrows\"><path d=\"M133 120 C136 105 167 98 179 107 C187 112 181 122 175 120 C161 115 150 120 139 124 Q133 126 133 120Z\" fill=\"#975222\" opacity=\".25\" transform=\"translate(0 2)\" filter=\"url(#study-soft)\"/><path d=\"M133 120 C136 105 167 98 179 107 C187 112 181 122 175 120 C161 115 150 120 139 124 Q133 126 133 120Z\" fill=\"url(#study-brow)\" stroke=\"#572b16\" stroke-width=\"1.2\"/><path d=\"M294 106 C304 98 331 102 343 114 C350 122 343 128 336 124 C323 117 313 119 301 120 C294 121 290 113 294 106Z\" fill=\"url(#study-brow)\" stroke=\"#572b16\" stroke-width=\"1.2\"/></g>\n<g class=\"eyes potatoEyes\" transform=\"translate(0 29.4) scale(1 .86)\">\n\n<ellipse cx=\"165\" cy=\"210\" rx=\"51\" ry=\"62\" filter=\"url(#study-eye-polish)\" fill=\"url(#study-white)\" stroke=\"#bd8153\" stroke-width=\"2.4\" transform=\"rotate(-7 165 210)\"/><ellipse cx=\"328\" cy=\"205\" rx=\"51\" ry=\"62\" filter=\"url(#study-eye-polish)\" fill=\"url(#study-white)\" stroke=\"#bd8153\" stroke-width=\"2.4\" transform=\"rotate(6 328 205)\"/>\n<g><ellipse cx=\"175\" cy=\"219\" rx=\"35\" ry=\"48\" fill=\"url(#study-iris)\" transform=\"rotate(-5 175 219)\"/><ellipse cx=\"319\" cy=\"214\" rx=\"35\" ry=\"48\" fill=\"url(#study-iris)\" transform=\"rotate(4 319 214)\"/><ellipse cx=\"177\" cy=\"218\" rx=\"26\" ry=\"37\" fill=\"#180a07\"/><ellipse cx=\"317\" cy=\"213\" rx=\"26\" ry=\"37\" fill=\"#180a07\"/>\n<ellipse cx=\"161\" cy=\"190\" rx=\"8\" ry=\"6\" fill=\"#fff\" transform=\"rotate(-30 161 190)\"/><ellipse cx=\"305\" cy=\"185\" rx=\"8\" ry=\"6\" fill=\"#fff\" transform=\"rotate(-30 305 185)\"/><ellipse cx=\"161\" cy=\"190\" rx=\"10\" ry=\"8\" fill=\"#fff\" opacity=\".15\" filter=\"url(#study-soft)\"/><ellipse cx=\"305\" cy=\"185\" rx=\"10\" ry=\"8\" fill=\"#fff\" opacity=\".15\" filter=\"url(#study-soft)\"/><circle cx=\"191\" cy=\"245\" r=\"5\" fill=\"#f3c79a\" opacity=\".35\"/><circle cx=\"333\" cy=\"240\" r=\"5\" fill=\"#f3c79a\" opacity=\".35\"/></g>\n</g>\n<g class=\"mouth potatoMouth\"><path d=\"M212 280 C218 272 226 288 248 288 C270 288 280 271 288 270 C302 268 290 308 263 315 C237 322 209 303 208 287 Q208 282 212 280Z\" filter=\"url(#study-mouth-cut)\" fill=\"url(#study-mouth)\" stroke=\"#763017\" stroke-width=\"1.7\"/><path d=\"M228 307 Q249 321 270 307\" fill=\"none\" stroke=\"#e5a056\" stroke-width=\"1.4\" opacity=\".75\"/></g>\n"};
})();
