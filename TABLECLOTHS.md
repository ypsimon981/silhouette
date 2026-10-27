# Repeating photographic tablecloths — v0.22.51

Potato levels now use a fixed 256 × 256 CSS-pixel repeat rather than enlarging a whole photograph to cover the board. The texture therefore keeps its natural scale on different screen sizes. Each selected material is prepared once and cached; there are no pointer listeners, frame loops or continuous Canvas updates.

## Material and asset

assets/tablecloths/linen-fine.webp: 512 × 512, 132,774 bytes. Generated with the built-in image tool, then resized and WebP-compressed without artistic edits. The browser uses reflected texture addressing in a 2 × 2 quadrant tile, making opposite borders exactly equal. This avoids depending on an approximate AI-generated seam. Six periodic, low-contrast textile motifs are composed over those real photographed fibres: blue windowpane, sage ticking, red gingham, oatmeal herringbone, cream damask and plain flax. Pattern periods divide the tile size. The photographic grain remains visible through the motif colours.

Generation prompt:
> Production material texture. One seamless tileable square swatch of plain natural ivory linen/cotton, photorealistic macro textile surface, overhead orthographic camera. Edge-to-edge uninterrupted fine warp and weft threads, tiny natural yarn slubs, delicate irregular fibres. Extremely even neutral soft light, flat planar cloth. Warm off-white, subtle low-contrast beige yarn variation. Fine dense weave with at least 180 threads across image. Texture must repeat with no visible seams; no directional gradients, no vignette, no folds, no shadows, no marks, no stains, no printed pattern, no checks, no stripes, no objects, no text. Real tactile woven linen, not noise, not plastic, not a large exaggerated weave. Square composition.

## Scope and compatibility

Animal and flower modes keep the previous atlas crops, cover sizing and no-repeat behaviour. The old atlas is loaded lazily only for that legacy path; potato modes use the new smaller source. Existing cosmetic selection and gameplay randomness are unchanged. Stale asynchronous results are discarded and failed loads leave the previous CSS background intact. Future CSS rules explicitly exclude animal and flower boards.

## Validation

Real Chromium: all six materials load; opposite RGB borders of the plain repeat match exactly (maximum difference zero); background repeats at a fixed 256px on 320, 390 and 768px-wide viewports; animal/flower modes retain cover and no-repeat; no JavaScript errors. Mobile-size visual inspection completed. No physical phone FPS claim.

The motif printing is a periodic colour treatment over real linen fibres, rather than six independent photographs of woven designs. tests/tablecloths.html previews all six repeating materials.
