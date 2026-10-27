# Neutral animal-footprint background — v0.22.56

The Animals board has a neutral warm-grey background (#e6e4dd) with scattered tone-on-tone footprints: padded paws, cloven hooves, bird tracks and rabbit tracks. Marks use #b6b3a9 at 28% opacity, with generous spacing and varied rotations. The silhouettes remain the strongest contrasting elements. This replaces the v0.22.55 leopard/linen treatment.

`assets/backgrounds/animal-tracks.svg` is a small, static native vector repeat (288 × 288 CSS pixels). No photographic texture or Canvas preparation is needed in this mode. `animal-background.css` scopes the flat background and repeat to Animals, explicitly excluding Flowers. `Tablecloths.applyAnimals` invalidates pending cloth requests before marking the new mode, preventing a previous background load from overwriting the selection.

Only this background changes. Animal/flower pieces, targets, reveal, geometry, input, clock, scores, audio and shadows retain their prior behaviour. Potato and flower backgrounds remain unchanged. AGENTS.md records the animal-background exception.

Validation: Chromium mobile-size visual inspection; static background and correct single-layer repeat; original animal targets and pieces; ten actual pointer placements complete the Animals level; correct isolation after switching to Flowers and Potatoes; no JavaScript errors. The linen regression passes. No physical-phone FPS claim is made.
