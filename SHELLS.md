# Conchiglie — v0.22.62

Official mode **19**, with ten different silhouettes drawn without replacement from a catalog of sixteen shells. It uses the existing 60-second timer, drag placement, reveal on successful placement, local records, sector history, statistics, rankings and verified challenges. The cognitive profile remains limited to the original ten potato levels.

The four special menu cards use two columns. Conchiglie has a pale sand surface with a small shell pattern. Its game board uses the same sand material; Animals, Flowers and potato boards retain their own artwork. The existing `level-animals` class remains the shared silhouette-mode rendering guard; `level-shells` scopes the sand and target colors.

## Asset alignment

`assets/shells/shells-atlas.webp` is a transparent generated atlas, encoded without cropping or rearranging its source. `scripts/build-shells.py` finds its sixteen main alpha components, traces their external contours and normalizes each to 90% of a 100-unit square. Each catalog entry includes an `imageBox` that maps the original atlas pixels into that exact silhouette. The existing image clip path prevents neighboring cells or alpha debris from appearing. Animal and flower images do not have `imageBox` and keep their original layout.

Source reference: the user's photograph of seven natural shells on a bamboo tray. Built-in image generation produced a 4×4 transparent collection with broad scallop, triangular clam, ribbed cockle, mussel, razor shell, round disc, heart shell, oyster, turret, round spiral, spindle, conch, cowrie, spiny shell, nautilus and ear-shaped shell. Labels are descriptive game names, not biological identifications. Prompt constraints: one connected shell per item, visibly different outlines, no external cast shadows or labels, natural cream/peach/brown/lavender materials. Sand prompt: quiet, evenly lit, fine pale beige beach sand, no objects or lettering.

## Server

`backend/official-shells.sql` expands the existing score/run constraints and owned-best/legacy score function allowlists to mode 19. It preserves records, rules, ownership checks and grants. The two existing Edge Functions add mode 19 to their allowlists while keeping Auth verification. Apply the database upgrade and deploy those functions before publishing the client. The production migration is `official_shells_level`.

## Validation

- Backend tests cover verified completion, dedicated ranking, owned-record challenge creation, accepting and winning a challenge, legacy record updates, rejection of unknown mode 20, and continued Animals/Flowers support.
- Client tests cover sixteen distinct contours, ten unique randomized selections, atlas coordinates, local records, statistics and relaunch.
- HTTP tests verify mode 19 reads, authenticated writes/challenges and missing-auth rejection.
- Real Chromium pointer tests complete ten placements at 320, 390 and 560 pixels and confirm image reveal and background isolation. All sixteen rendered cutouts were visually inspected together.
- Existing Animals and Flowers pointer/background tests pass. The four-section navigation, completion, retry and sharing regression passes with the new fourth special card.
- The full suite retains two pre-existing DOM failures (capitalization of the replay label and outdated `.burnedStart` markup expectations), reproduced on the previous app version earlier in this task. The release cache-key check passes after the v0.22.62 update.
