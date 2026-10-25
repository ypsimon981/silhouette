# Flowers / Fiori — mode 18

25 original transparent flower cutouts, generated separately with the built-in image generator. Each round selects ten unique flowers from this pool. The normal game timer, three sectors, records, leaderboards and sharing are retained. The coloured image appears only after the matching silhouette is seated.

## Production prompt

Use case: photorealistic-natural. Single game asset cutout: [subject]. One single botanically realistic flower only, whole subject fully visible, centered in square frame with 10% empty margin on every side. Detailed natural petal textures, soft studio light. Distinct compact continuous outer silhouette, all parts connected, robust broad shapes suitable for a silhouette puzzle at small size. No detached petals, no ground or cast shadow, no text, no border. Genuinely transparent background.

## Subjects

Rosa, tulipano, loto, calla, orchidea, girasole, margherita, papavero, iris, giglio, narciso, ibisco, peonia, dalia, garofano, gerbera, magnolia, bucaneve, campanula, fiordaliso, viola, anemone, crisantemo, strelitzia, fucsia.

Subjects use frontal, three-quarter or profile views to distinguish their silhouettes. Short stems and attached broad leaves are used where they help recognition; round flower heads are shown without long stems.

## Asset processing

`scripts/build-flowers.py` reads a source manifest and preserves the source images. Each RGBA cutout is fitted inside a 512 × 512 transparent canvas with a 460-pixel maximum extent, saved as WebP, and traced from its alpha channel. Small boundary irregularities are simplified and rounded with quadratic curves. Image and outline share the same coordinates and clipping path.

The source manifest is an array of `{id, name, source}` records pointing to original generated PNGs. Run `python scripts/build-flowers.py /absolute/path/to/flower-sources.json` with Pillow, NumPy and OpenCV installed.

Backend upgrade order: `backend/official-animals.sql`, then `backend/official-flowers.sql`. The latter extends the existing score/run constraints and the existing score/challenge functions without changing their access rules. Deploy both ranking/social Edge Functions from this revision.
