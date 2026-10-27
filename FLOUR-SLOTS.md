# Flour targets — potato levels only

The exact existing rounded potato path defines the opening, rotation and thin dark contour. The tablecloth remains fully visible inside: the raster is cleared with the original path after drawing the flour. Flour has a compact band outside the contour, fine powder and larger irregular clusters at its exterior. Upper and lower edges use the same widths. No interior fill, inner shadow or displacement of the matching geometry is introduced.

The decorative raster is generated once per outline with Canvas/Path2D, independently of the gameplay RNG, then cached (up to 64 outlines) and displayed as a static SVG image. There are no animation loops, live blur filters or pointer listeners in this renderer. The vector `.recess-floor` remains transparent and retains its bounds for the existing result layout. On unsupported browsers the original target is retained.

`shape()` explicitly excludes both animal and flower modes. New CSS also excludes both board classes. Existing animals, flowers, sizes, input handling, matching tolerance, timing, scoring and central piece shadows are unchanged.

Validation: real Chromium pointer placement across three viewports and modes 1, 13 and 17; ten pieces complete; shadow regression checks; flour pixel test for a fully transparent interior beyond the contour; exact path/rotation checks across the potato catalog; cached artwork reuse; no gameplay RNG use; original targets in modes 17 and 18; mobile-size visual inspection. No physical iPhone FPS measurements are claimed.
