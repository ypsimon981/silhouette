# Photographic base potatoes — v0.22.53

The approved overhead raw-potato appearance now replaces the flat skin in levels 1 and 2, including their stages in the sequence modes. Eleven distinct images cover ten base families and both star variants; existing rotations reuse those images. Levels 3–10 retain the prior artwork for the next stage of the conversion. Animals and flowers keep their original rendering.

## Production assets and generation

The assets are `assets/potato-photo/{circle,square,ell,ring,square-hole,star-1,star-2,rectangle,semicircle,triangle,crescent}.webp`. Together they weigh 696,990 bytes (about 681 KiB), with a maximum image size of 512 × 512. Alpha transparency is preserved. Asset metadata, the final exact prompts for each image, raw/rounded geometry, registration bounds and pre-clip silhouette comparisons are in `assets/potato-photo/manifest.json`.

Built-in image generation was used, one call per shape. Grey silhouettes exported from the original rounded paths supplied geometry references. The approved L photograph supplied the initial material reference; square, L and crescent were regenerated with geometry-only references when the first outputs failed contour inspection. WebP conversion only downsizes/compresses the original generated images. It does not paint or recolour them.

## Geometry and rendering

`photo-potatoes.js` selects an image by the exact original catalog path. An affine registration aligns the photograph's opaque bounding box to the original contour bounds. The original rounded vector is then used as the SVG clip and as the opaque edge backing, so minor generative perimeter differences cannot produce holes or change the piece silhouette. The original front path, rotation, CSS box, placement tolerance and slots remain unchanged. Photo surfaces have baked overhead light; central ground shadows remain dynamic and use the existing actual-position shadow module.

There is no runtime 3D engine, Canvas baking, live filter or new animation loop in the photo renderer. Images are preloaded for the two base levels. If a catalog path has no photo asset the original rendering is used. No changes to audio, timings, score, shape randomization or non-potato artwork are introduced.

## Verification

Real Chromium: every base rotation uses the exact original vector/clip; no gameplay RNG is consumed; all images load; ten placements complete in each of levels 1 and 2; levels 3, animals and flowers retain original rendering; all 173 catalog variants retain matching shadows; real pointer play on 320, 390 and 768px viewports passes; dragging with nine seated pieces performs no seated SVG geometry reads or live shadow filtering. Mobile-size inspection of all eleven assets and a live board completed. No physical iPhone FPS claim is made.

The assets are photographic sprites, not freely rotatable 3D models. The visual conversion of the remaining 80 distinct silhouettes is not part of this base-set release.
