# Photographic tablecloths
Six generated photographic textile panels: blue windowpane, sage ticking, red gingham, oatmeal herringbone, cream damask, plain flax. Camera and lighting are overhead. Source atlas: 1536 × 1024 PNG, about 4.51 MiB. This source download is not yet offline-compressed to WebP; browser crops are encoded to WebP once per selected fabric and cached for the page lifetime. Browsers without WebP encoding fall back to PNG via the Canvas API.

## Integration
Existing six-choice cosmetic selection and crypto randomness are unchanged. After the existing CSS fallback is selected, tablecloths.js crops the selected panel (512 × 512), predecodes it, and updates existing CSS variables. Each result is cached; stale asynchronous selections are discarded. Canvas work happens only on a fabric's first load, never during pointer movement. No requestAnimationFrame loop, WebGL, animated filter, pointer listener or gameplay RNG is added. Image/Canvas failure leaves the prior CSS fabric in place. Tablecloths use one cover image with its aspect ratio preserved, rather than repeating an atlas or stretching the weave.

index.html, tablecloths.js and tablecloths.css are the integration files. Existing pieces, central shadows, slot geometry, timing, audio, scoring and game input handlers are unchanged.

## Review
Open tests/tablecloths.html through the normal local HTTP server to inspect all six materials. The game uses the same module.

Validation performed: module and inline-script JavaScript syntax; mocked checks of all six source crop bounds, cache reuse, asynchronous selection races, failed image fallback.
Validation unavailable: real browser rendering, physical phone FPS, initial-load timing and in-game contrast. Execution environment was unavailable during this change. Do not treat the mocked checks as browser or performance measurements. The PNG source increases the initial download by roughly 4.5 MiB; offline WebP compression remains a follow-up optimization.
