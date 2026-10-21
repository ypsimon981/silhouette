# 10 Potatoes — v0.22.1

Reference-character update: four stable level skins (yellow, yellow/red patched, red, purple), repeated every four levels. Every potato in a given level uses the same variety, including Overall stages. Background tint and diffuse platform neon follow that variety. SVG skin gradients, broad clipped patches for the patched variety, and freckles require no image downloads or gameplay random calls.

Eyes now have shaded whites, brown irises, dark pupils and highlights. The open mouth includes teeth and tongue. The standard face uses 25-unit eyes and a 30-unit mouth in its normalized 100-unit reference frame, adapted to the available solid area of each silhouette; narrow shapes cannot retain those percentages of the full outer height. Faces remain upright. Hollow shapes retain their original outside dimensions but now have a 12-unit opening (ring previously 44, square previously 40), with large eyes above and mouth below it. L arms increase from 30 to 48 units. These requested geometry changes are shared by pieces and their matching recesses and consume no gameplay randomness. Shape families and selection, timing, tolerance, player data and records are preserved.

Validation: 32 automated tests pass. `node tests/build-potato-sheet.cjs` generates `docs/potato-varieties.svg` from the actual game renderer for skin, hollow-shape and rotated-L review. `node tests/build-potato-preview.cjs` also includes levels 2 and 3 to review all four varieties in the actual game layout. SVG reference sheet rendered and inspected with Inkscape. Physical iOS/Android performance testing remains outstanding.

## Initial v0.22.0 release

Full visual rebrand with warm sage/earthy fields, golden potato pieces, a tray-like central platform, diffuse warm underglow, potato mascot/favicon, restyled home/profile/rankings/performance/social screens, and branded share cards. Existing storage keys, identity, backend/rules version, records and statistics are preserved.

The original shape catalog, families, rotations and random selection stay intact. A shared cached renderer applies a 1.35-unit quadratic corner treatment to straight polygon paths on both pieces and cutouts; curved paths retain their original contours. Even-odd holes remain holes. Pointer hit testing, tolerance, countdown duration and timer are unchanged.

Potato bodies use small static SVG gradients and clipped freckles. Faces sit on solid regions of each silhouette and stay upright as the silhouette rotates, including ring/hollow-square and crescent pieces. Each character has one of four mouth/brow expressions. Eyes blink with staggered CSS timing; placed potatoes look toward the center and periodically glance sideways. Rejected placements prompt a short facial reaction, and completed boards broaden the smiles. Bodies remain still. Reduced-motion preference disables eye animations. No recurring JavaScript animation timer or extra work in the game clock/drag loop is introduced; the short rejection timer is cleared on restart/exit.

Validation includes all existing tests plus catalog-wide piece/cutout equivalence, hole preservation, finite corner geometry, unique SVG IDs, upright faces, cosmetic rendering without gameplay RNG calls, rejection/reset behavior, and completing all ten pieces through the existing placement/timing flow.

`node tests/build-potato-preview.cjs` regenerates `docs/potatoes-preview.html`: isolated static snapshots of the real home, level 1 and level 4 markup for 320×568, 390×844 and 768×1024 layout review. It runs no live game scripts and submits no scores or profiles. The local Playwright browser download was unavailable; physical Android/iOS frame-rate/device validation is still required.
