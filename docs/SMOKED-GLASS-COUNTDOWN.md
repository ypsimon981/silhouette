> Historical design: replaced in v0.22.4 by the potato-and-knife countdown. See `10-POTATOES.md`.

# Smoked glass platform — v0.21.45

The central platform retains a three-dimensional volume with a slightly translucent smoked glass face, a discreet rim, and visible side thickness. The pastel board and recessed shape slots are preserved.

Four stacked decks form the countdown. START belongs to the highest deck. The visible inscription advances from 3 to 2 to 1 as each upper deck disappears, revealing the next deck. At three seconds only the playing base remains; the timer starts and the first shape appears together. The accessible live countdown remains available to screen readers.

Animations use opacity and transforms, without backdrop blur, additional animation loops, network waits or forced layout reads. Reduced motion disables the transitions while preserving the countdown stages.

Validation: `npm test` — 25 passed, 0 failed. The new deterministic client test checks all countdown stages, disappearing decks, timer/shape start, and cancellation on leaving the game. Existing sector, history, sharing and backend checks pass. Automated DOM checks do not replace visual verification on physical Android/iOS devices; physical-device verification was not available in this environment.
