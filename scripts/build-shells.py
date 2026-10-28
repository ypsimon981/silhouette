"""Derive aligned shell silhouettes from an untouched transparent sprite atlas.
Usage: python scripts/build-shells.py /absolute/path/to/generated-atlas.png
The atlas is encoded as WebP without cropping or compositing. SVG imageBox values
align its original pixels with each normalized contour; source alpha is preserved.
"""
import json,sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
root=Path(__file__).resolve().parents[1]
image=Image.open(sys.argv[1]).convert('RGBA')
alpha=np.asarray(image)[:,:,3]
assert alpha.min()==0 and alpha.max()==255
contours,_=cv2.findContours((alpha>128).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
objects=[c for c in contours if cv2.contourArea(c)>3000]
assert len(objects)==16, f'Expected sixteen connected shells, got {len(objects)}'
center=lambda c: (cv2.boundingRect(c)[0]+cv2.boundingRect(c)[2]/2,cv2.boundingRect(c)[1]+cv2.boundingRect(c)[3]/2)
objects.sort(key=lambda c:center(c)[1])
objects=[c for i in range(0,16,4) for c in sorted(objects[i:i+4],key=lambda c:center(c)[0])]
names=[('ventaglio','Ventaglio'),('triangolare','Guscio triangolare'),('costata','Conchiglia costata'),('cozza','Guscio allungato'),('cannolicchio','Guscio sottile'),('disco','Guscio rotondo'),('cuore','Guscio a cuore'),('ostrica','Guscio irregolare'),('torre','Spirale a torre'),('chiocciola','Spirale tonda'),('fuso','Conchiglia a fuso'),('strombo','Conchiglia svasata'),('ciprea','Guscio ovale'),('murice','Conchiglia spinosa'),('nautilus','Spirale ampia'),('orecchia','Guscio a orecchia')]
catalog=[]
for contour,(ident,name) in zip(objects,names):
    x,y,w,h=cv2.boundingRect(contour)
    assert x>0 and y>0 and x+w<image.width and y+h<image.height
    scale=90/max(w,h);cx,cy=center(contour)
    pts=cv2.approxPolyDP(contour,.65,True)[:,0,:]
    pts=(pts-np.array([cx,cy]))*scale+50
    start=(pts[-1]+pts[0])/2
    path=f'M{start[0]:.2f},{start[1]:.2f}'
    for i,p in enumerate(pts):
        end=(p+pts[(i+1)%len(pts)])/2
        path+=f' Q{p[0]:.2f},{p[1]:.2f} {end[0]:.2f},{end[1]:.2f}'
    path+=' Z'
    catalog.append(dict(id=ident,name=name,path=path,image='./assets/shells/shells-atlas.webp',imageBox=[round(50-cx*scale,4),round(50-cy*scale,4),round(image.width*scale,4),round(image.height*scale,4)]))
(root/'assets/shells').mkdir(exist_ok=True)
image.save(root/'assets/shells/shells-atlas.webp','WEBP',quality=88,method=6)
(root/'shells-catalog.js').write_text('window.ShellCatalog='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Built {len(catalog)} aligned shells; atlas {(root/"assets/shells/shells-atlas.webp").stat().st_size:,} bytes')
