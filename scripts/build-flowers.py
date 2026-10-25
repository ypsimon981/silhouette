"""Build aligned, transparent game assets and smooth silhouettes from generated cutouts.

Usage: python scripts/build-flowers.py /absolute/path/to/flower-sources.json
The manifest is an array of {id, name, source} objects. Source images stay untouched.
"""
import json
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
out = root / 'assets/flowers'
out.mkdir(parents=True, exist_ok=True)
def build(entry):
    original = Image.open(entry['source']).convert('RGBA')
    alpha = np.asarray(original)[:, :, 3]
    assert alpha.min() == 0 and alpha.max() == 255, entry['id']
    bounds = Image.fromarray((alpha > 64).astype('uint8') * 255).getbbox()
    assert bounds, entry['id']
    flower = original.crop(bounds)
    flower.thumbnail((460, 460), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (512, 512))
    canvas.paste(flower, ((512-flower.width)//2, (512-flower.height)//2))
    mask = (np.asarray(canvas)[:, :, 3] > 64).astype('uint8') * 255
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(contour)
    # Every flower must be one connected, fully framed object.
    assert sum(cv2.contourArea(c) for c in contours if c is not contour) < area * .02, entry['id']
    points = cv2.approxPolyDP(contour, .65, True)[:, 0, :] / 5.12
    start = (points[-1] + points[0]) / 2
    path = f'M{start[0]:.2f},{start[1]:.2f}'
    for i, point in enumerate(points):
        end = (point + points[(i+1) % len(points)]) / 2
        path += f' Q{point[0]:.2f},{point[1]:.2f} {end[0]:.2f},{end[1]:.2f}'
    path += ' Z'
    image = f'./assets/flowers/{entry["id"]}.webp'
    canvas.save(root / image, 'WEBP', quality=88, method=6)
    return dict(id=entry['id'], name=entry['name'], path=path, image=image)

with ThreadPoolExecutor(max_workers=4) as pool:
    catalog = list(pool.map(build, json.loads(Path(sys.argv[1]).read_text())))
(root / 'flowers-catalog.js').write_text('window.FlowerCatalog=' + json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'Built {len(catalog)} flowers, {sum((root / f["image"]).stat().st_size for f in catalog):,} image bytes')
