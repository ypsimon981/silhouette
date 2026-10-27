# Photographic potato countdown

The user explicitly approved sharing these four countdown sprites with every game mode, including animals and flowers. This exception does not extend to flour targets, pieces or future cosmetic work. The original timing, animation, input handling and 3-second countdown are unchanged.

## Production assets

- assets/brand/countdown-start-photo.webp — 1120 × 373, 144,554 bytes
- assets/brand/countdown-3-photo.webp — 480 × 720, 110,944 bytes
- assets/brand/countdown-2-photo.webp — 480 × 720, 96,196 bytes
- assets/brand/countdown-1-photo.webp — 480 × 720, 87,302 bytes

All four retain their generated alpha transparency. WebP conversion only resizes and compresses; no artistic recolouring or surface edits were applied. Total: 438,996 bytes (about 429 KiB). Existing approved sprites are retained for history. Preload links and the two countdown render functions now reference the new sprites. There is no new 3D engine, Canvas renderer or animation loop at runtime.

## Generation

Built-in image generation, one call per asset, with transparent_background=true. The approved overhead L image at tests/potato-photo/assets/potato-l-approved.png was supplied as a material/lighting reference, not as the target silhouette.

Shared prompt:

> Use case: product-mockup. Production transparent game sprite for 10Potatoes. Input image: material, surface realism, thin thickness, and lighting reference ONLY; do not reproduce its L silhouette. Match the approved raw potato: pale warm buff/tan skin, fine papery flakes, natural subtle brown eyes and dimples, mottled earth tones, matte dry skin. Hyperrealistic photographic object, real potato organically grown into the requested shape, gently rounded swollen edges, relatively thin body. Camera EXACTLY overhead orthographic looking straight down, no perspective slant, very little visible side wall, broad soft overhead illumination. No face, no eyes as character features, no mouth, no eyebrows, no cartoon styling, no polish or plastic, no decorations, no flour, no plate, no cloth. Truly transparent background, clean antialiased alpha, no fake checkerboard, no background rectangle, no detached cast shadow. Centre the complete object, generous transparent safety margin, nothing clipped. Shape must remain very readable at small game size.

START extension:

> Text (verbatim): "START". Five separate rounded potato letters S T A R T, in one perfectly horizontal row, tightly but clearly spaced, all same height, no overlap, with open counters in A and R. Wide landscape composition, about 3:1 aspect ratio. Each letter is a real natural potato shaped into that letter. The word must be instantly legible.

Digit extension, issued separately for n = 3, 2 and 1:

> Subject: exactly one upright numeral "n", made from one continuous raw potato body. No other numerals or letters. Thick rounded strokes, clean open negative spaces, instantly legible silhouette. Portrait composition.

## Verification

Real Chromium test for modes 1, 17 and 18: START and each digit decode, the clock remains at zero during countdown, play begins only after the full countdown, and one active piece appears. Non-potato targets remain original. Visual inspection of START and the digit 3 over the actual board. No physical phone FPS claim is made.
