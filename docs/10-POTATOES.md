# 10 Potatoes — v0.22.5

The supplied 1536×768 JPEG brand board is included unchanged at `assets/brand/10potatoes-board.jpeg` (307 KB). Native SVG viewports reuse its cream horizontal logo on the home screen, brown-backed potato mascot in the toolbar and compact brown logo in the banner placeholder. The share-card canvas draws the top horizontal logo directly from the same-origin JPEG, with a text fallback if image decoding fails. It exports both portrait and square PNGs without cross-origin dependencies.

`potato-theme.css` is the final theme layer after `social.css`: dark potato brown, warm cream, skin tan and golden flesh replace cool UI accents, metallic gradients, facets and glow. Fine static lenticel patterns cover buttons, panels, header/footer and social dialogs. Rankings, profile fields, performance charts, hand controls and results all follow the new palette. Tablecloth colors now stay within warm beige/tan shades; all four original potato skin varieties, face proportions, countdown and gameplay remain intact. Rank/sector styling keeps distinct tones and text labels; underlying ranking/sector logic does not change.

Validation: 32 automated tests; kitchen/browser checks for countdown, unobscured results and responsive layouts in both hands; a dedicated brand check covers JPEG decoding, logo placement, actual computed matte button paint, cream profile/home surfaces, rankings, portrait/square share-image export and a 320 px home layout. Review screenshots and static preview were inspected. Physical-device checks remain outstanding.

The preview generator embeds the artwork in its standalone review HTML; the live game downloads the original sheet once and reuses it from cache. No image-generation dependency, external font, noise filter, additional animation loop or gameplay RNG call is introduced.

---

# 10 Potatoes — v0.22.4

The opening button is a whole, textured potato with a burned START mark. Pressing it starts the existing three-second countdown: an animated kitchen knife cuts one numbered slice per second (3, 2, 1). Earlier slices remain visible beside the potato; the knife and fresh slice animate once per beat. At zero, the entire prop disappears and the timer/first playable potato start together. The old glass pedestal is removed. Exit/restart cancels all countdown callbacks as before; Overall stages receive a fresh whole START potato. SVG artwork is native, small and independent of gameplay random selection; reduced-motion mode retains clear numbered slices without the knife/drop animation.

The board now uses six quiet tablecloth patterns: gingham, ticking stripes, windowpane, diamonds, floral damask and linen weave. Six muted cloth colors rotate by level independently of the unchanged four potato varieties. Pattern selection uses the existing cosmetic crypto RNG and never consumes shape randomness. Fabric remains unchanged during an individual countdown/game. No opaque pregame/finish wash, blur or full-field overlay covers the potatoes.

Results live in the clear central corridor between the ten unchanged board positions. The card's bounds come from actual slot rectangles and update on resize. Time, sectors and Rigioca are immediately visible; other navigation/social actions remain accessible by scrolling inside the card. Potatoes continue blinking, glancing and smiling around it. On timeout, the unplaced potato rests in the unused side position without being scored, leaving the results readable and every visible potato unobscured. Face animations and scoring/timing rules remain unchanged.

Validation: `npm test` (32 tests); `CHROMIUM_EXECUTABLE=<browser> npm run test:kitchen:ui` checks live countdown visibility, numbered slices, delayed timer start, no platform during play, central-card/potato non-overlap for wins and timeouts in both hands at 320×568, 390×844 and 768×1024, working analysis navigation and resize behavior. The existing automatic test covers canceling pending countdown callbacks. Physical-device checks remain outstanding.

`node tests/build-potato-preview.cjs` regenerates `docs/potatoes-preview.html`, now including START, each slice, play and results scenes. Snapshots contain no live game/network scripts or score submissions. The previous smoked-glass document below is historical.

---

# 10 Potatoes — v0.22.3

The existing SVG catalog and renderer now produce solid, fleshy potatoes. The legacy `ring` and `square-hole` IDs represent a full oval and a rounded cushion; they remain distinct from the circle and square, preserving ten families and the selection flow. Both stars have shorter, broader points; the crescent has a shallower recess; L, cross, arrow, hourglass and chevron bodies are thicker. Triangles, rectangles, squares and polygonal level-three shapes use tangent circular corner arcs with a nominal seven-unit radius on the 100-unit canvas (about 5 px on a 72 px piece), limited only by adjacent edge length. Semicircle ends and shield corners use explicit curves. Organic levels retain their weights/codes/order and nominal scale, with contour deviations reduced to 78% to broaden their cores and shorten lobes.

`potatoPath` supplies the same cached geometry to pieces, cutout floors/rims, skin clipping and face clipping. Collision acceptance in this game uses center distance, not a polygon physics mesh; its existing `.46 * piece width` tolerance and pointer handlers remain unchanged. Ten board positions, timer, scoring, records, random selection, face dimensions/anchors/expressions and animation CSS are unchanged. Geometric recognition necessarily changes with the requested new shapes; no difficulty settings or progression rules are retuned.

All four original palettes and their level assignment remain intact. Soft central light replaces the previous upper-edge highlight. A static user-space pore pattern and two batched lenticel paths add fine grain with natural color variation; the patched variety keeps its three patches. All texture follows the exact outline without bitmap scaling, external images, noise filters, gameplay randomness or drag-loop work.

## Validation

- `npm test`: 32 passing tests, including complete placement, rejection/reset reactions, timing/statistics/social regressions, shared geometry, a single closed contour per shape and stable four-variety selection.
- `CHROMIUM_EXECUTABLE=<browser> npm run test:potatoes:ui`: browser geometry coverage of all 123 catalog entries and rotations, sampled full eye ellipses and mouth outlines inside the potato, exact cutout/path matching, and real pointer placements on all ten levels at 320×568, 390×844 and 768×1024 (300 placements).
- Actual renderer sheet inspected as a PNG via Inkscape; mobile static previews regenerated. Existing face sizes and anchors are preserved, including the original special face proportions on the former hollow-family IDs.
- Same-host Chromium construction benchmark, eight batches of 150 SVG pieces with the first batch discarded: median 59.3 ms for v0.22.2, 38.6 ms for v0.22.3. A standard piece decreases from 71 to 55 SVG descendant nodes. These are renderer construction measurements, not a physical-device FPS guarantee; physical Android/iOS checks remain outstanding.
- The older general `test:ui` suite was attempted: its browser process/context lifecycle failed in this headless setup and the online-challenge fixture timed out. Those checks are not counted as passes; the dedicated geometry/pointer suite above isolates this change using local fixtures.

Commands `node tests/build-potato-sheet.cjs` and `node tests/build-potato-preview.cjs` regenerate the checked-in review assets. No live accounts or scores are modified by these fixtures.

---

# 10 Potatoes — v0.22.2

Reference-character update: four stable level skins (yellow, yellow/red patched, red, purple), repeated every four levels. Every potato in a given level uses the same variety, including Overall stages. Background tint and diffuse platform neon follow that variety. SVG skin gradients, broad clipped patches for the patched variety, and freckles require no image downloads or gameplay random calls.

Character path paint uses explicit inline styles so legacy metallic path rules cannot hide mouths, pupils or skin patches. The regression test checks computed paint inside a real piece DOM container.

Eyes now have shaded whites, brown irises, dark pupils and highlights. The open mouth includes teeth and tongue. The standard face uses 25-unit eyes and a 30-unit mouth in its normalized 100-unit reference frame, adapted to the available solid area of each silhouette; narrow shapes cannot retain those percentages of the full outer height. Faces remain upright. Hollow shapes retain their original outside dimensions but now have a 12-unit opening (ring previously 44, square previously 40), with large eyes above and mouth below it. L arms increase from 30 to 48 units. These requested geometry changes are shared by pieces and their matching recesses and consume no gameplay randomness. Shape families and selection, timing, tolerance, player data and records are preserved.

Validation: 32 automated tests pass. `node tests/build-potato-sheet.cjs` generates `docs/potato-varieties.svg` from the actual game renderer for skin, hollow-shape and rotated-L review. `node tests/build-potato-preview.cjs` also includes levels 2 and 3 to review all four varieties in the actual game layout. SVG reference sheet rendered and inspected with Inkscape. Physical iOS/Android performance testing remains outstanding.

## Initial v0.22.0 release

Full visual rebrand with warm sage/earthy fields, golden potato pieces, a tray-like central platform, diffuse warm underglow, potato mascot/favicon, restyled home/profile/rankings/performance/social screens, and branded share cards. Existing storage keys, identity, backend/rules version, records and statistics are preserved.

The original shape catalog, families, rotations and random selection stay intact. A shared cached renderer applies a 1.35-unit quadratic corner treatment to straight polygon paths on both pieces and cutouts; curved paths retain their original contours. Even-odd holes remain holes. Pointer hit testing, tolerance, countdown duration and timer are unchanged.

Potato bodies use small static SVG gradients and clipped freckles. Faces sit on solid regions of each silhouette and stay upright as the silhouette rotates, including ring/hollow-square and crescent pieces. Each character has one of four mouth/brow expressions. Eyes blink with staggered CSS timing; placed potatoes look toward the center and periodically glance sideways. Rejected placements prompt a short facial reaction, and completed boards broaden the smiles. Bodies remain still. Reduced-motion preference disables eye animations. No recurring JavaScript animation timer or extra work in the game clock/drag loop is introduced; the short rejection timer is cleared on restart/exit.

Validation includes all existing tests plus catalog-wide piece/cutout equivalence, hole preservation, finite corner geometry, unique SVG IDs, upright faces, cosmetic rendering without gameplay RNG calls, rejection/reset behavior, and completing all ten pieces through the existing placement/timing flow.

`node tests/build-potato-preview.cjs` regenerates `docs/potatoes-preview.html`: isolated static snapshots of the real home, level 1 and level 4 markup for 320×568, 390×844 and 768×1024 layout review. It runs no live game scripts and submits no scores or profiles. The local Playwright browser download was unavailable; physical Android/iOS frame-rate/device validation is still required.
