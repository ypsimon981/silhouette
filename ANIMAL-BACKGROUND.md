# Desaturated animalier background — v0.22.55

An intentionally quiet greige leopard-rosette pattern on the existing fine linen texture replaces the Animals background only. The SVG rosettes use #999b92 at at most 24% opacity, with small flecks at 13%. Broad spacing and pale neutral marks keep dark empty targets and the active cream silhouette visually dominant. No animal figures or solid high-contrast stripes are used in the background.

`assets/backgrounds/animalier-soft.svg` is a native vector pattern; no new generated photo is required. The linen uses the existing seamless mirrored tile, prepared/cached by tablecloths.js. Both layers repeat at fixed size (288px motif, 256px weave). `animal-background.css` scopes the treatment to `.level-animals:not(.level-flowers)` in ready, countdown, play and results states. A flat pale fallback retains the quiet pattern if the linen image cannot load. An asynchronous selection token prevents an old cloth request overwriting a later mode.

Only the background changes. Animal/flower silhouettes, target cavities, photo reveal, position, dimensions, matching, audio, scores, clock and central piece shadows remain unchanged. Potato and flower backgrounds keep their existing treatment. AGENTS.md records this explicit animal-only exception.

Validation: mobile-size Chromium visual inspection; no background animation; correct background scopes after switching to flowers and potatoes; original animal targets and pieces retained; ten actual pointer placements complete the animal level; no JavaScript errors. The linen-repeat regression still passes. No physical phone FPS claim is made.
