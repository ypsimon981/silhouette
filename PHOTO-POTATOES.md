# Photographic potato rendering — v0.22.54

All 91 distinct potato contours and all 123 orientations now use photographic potato surfaces across levels 1–10 and their stages in Overall, Odd and Even modes. Animals and flowers retain their original rendering. Existing matching geometry, tolerances, timing, scoring, audio and central ground shadows are unchanged.

## Assets and method

The eleven approved base sprites remain unchanged. The 80 additional sprites are rendered offline by projecting those photographed convex potato surfaces onto each original catalog contour. Radial UV coordinates retain the photographed skin and volume falloff; the actual contour distance/normal adds a restrained matte contact rim, including in concave regions. Crosses and early lobed shapes use matching star or triangle source surfaces to reduce texture stretch. Source material and orientation vary deterministically per shape. This is a reuse of approved photographic material, not eighty new independently generated photographs.

All production sprites are under `assets/potato-photo/`. Names for level 3 are diamond3, hexagon3, cross3, pentagon3, trapezoid3, arrow3, hourglass3, chevron3, shield3 and kite3. Levels 4–10 use organic{level}-{0..9}.webp. The full metadata, exact contours, per-asset source material and sizes are in `assets/potato-photo/manifest.json`; the original eleven generation prompts are retained there. Total catalog size is 2,885,302 bytes, about 2.75 MiB. Each sprite is at most 512 × 512 with transparency.

`photo-potatoes.js` looks up the exact original path, preserves the vector front path and rotation, and clips the image to that same outline. Only the selected level's material set is preloaded. No mesh renderer, Canvas generation, texture projection, new filter or frame loop runs during gameplay. The original eleven registrations use their measured photographic bounds; derived sprites use the catalog's 0–100 coordinates directly.

## Reproducing advanced assets

The native renderer is in tools/potato-photo/:

1. `node tools/potato-photo/export-all.cjs`
2. `node tools/potato-photo/render-all.cjs`
3. `python tools/potato-photo/compress.py`
4. `python tools/potato-photo/build-runtime.py`

Use the project Playwright dependency and an available Chromium (`CHROMIUM_EXECUTABLE` overrides the task environment default). Pillow is used only to encode the pre-rendered output as WebP. The rendering code itself does the geometry/UV work. Intermediate PNGs and exported geometry are reproducible and do not ship to players.

## Verification and limits

Real Chromium checks all 91 images decode, all 123 original contours/rotations are preserved, each of the ten levels completes through real pointer placements, a new level fetches only ten sprites, animals/flowers retain their original renderer, and no gameplay RNG is consumed. Existing shadow regression checks cover all 173 catalog variants and verify dragging does not revisit seated geometry or run live blur filters. Gallery inspection includes levels 3, 4, 7 and 10. No physical phone FPS is claimed.

The advanced skins use UV projection: freckles can elongate in strong lobes and recesses, and the surface lighting is baked into the sprite. Dynamic ground shadows still follow the actual piece position. The images are not freely rotatable 3D models. `tests/photo-potatoes.html` offers a per-level visual gallery.
