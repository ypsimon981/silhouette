from pathlib import Path
from PIL import Image
import json
p=Path('tools/potato-photo/advanced-manifest.json');advanced=json.loads(p.read_text())
for e in advanced:
 src=Path('tools/potato-photo/rendered')/(e['name']+'.png');dst=Path(e['url']);Image.open(src).save(dst,'WEBP',quality=90,method=4,exact=True);e['bytes']=dst.stat().st_size
p.write_text(json.dumps(advanced,indent=2))
p=Path('assets/potato-photo/manifest.json');base=json.loads(p.read_text())[:11];p.write_text(json.dumps(base+advanced,indent=2));print('assets',len(advanced),'bytes',sum(e['bytes'] for e in advanced))
