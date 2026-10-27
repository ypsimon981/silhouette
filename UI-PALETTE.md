# Menu palette — v0.22.59

Approved direction: natural tan jute bands, neutral cream menu, golden potato-peel level cards and dark cocoa lettering. PLAY remains honey gold. Layout, banner inventory and game mechanics are unchanged.

`potato-theme.css` repeats the two 512×512 WebP material tiles at 256 CSS pixels rather than stretching a full-screen mockup. Alternating card offsets avoid identical freckles on adjacent cards. Jute chrome rules exclude active `.level-animals` and `.level-flowers` screens. `updateToolbar()` similarly preserves their original browser theme color using `isSilhouetteMode(mode)`.

Assets generated with the built-in image generation tool, then resized and encoded as WebP:

- `assets/ui/jute-natural.webp`: seamless flat natural tan potato-sack jute, muted oat brown #C6AC83, fine irregular warp/weft, low contrast, even light, no folds/seams/objects.
- `assets/ui/potato-peel.webp`: seamless flat warm golden tan potato peel #D7A366, tiny sparse brown freckles and delicate pores, even light, no object/face/edges or large shadows.

Keep these assets local so the material is available wherever the rest of the game is served. Animals and Flowers retain their gameplay backgrounds, targets, pieces and toolbar treatment.
