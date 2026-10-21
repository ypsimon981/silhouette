# Analisi delle performance — three sectors

Each single level uses boundaries 2 / 5 / 10 placements. Boundaries and the finish total are sampled from performance.now(), not from the last animation frame. Rounded cumulative boundaries are subtracted in integer milliseconds, so S1 + S2 + S3 equals the persisted total exactly. Countdown is excluded. An input arriving after the existing 60-second limit cannot win before the next animation frame.

The reference is captured when play starts, before any result is saved. Green/yellow compare against the corresponding sector of that specific prior personal-best run; equal or missing data is neutral. Independent sector minima never replace this reference. Overall continues to use its existing stage splits; its constituent single-level runs also record sectors.

`10shapes_attempt_history_v2` keeps existing history and adds nullable sectors, attempt UUID, player ID, level and timestamp. `10shapes_sectors_v1` retains each player's per-level record run, five fastest measured runs and all-time sector minima independently of history eviction. Historical times are never given estimated sectors. A legacy record without sector detail remains authoritative; its detail is unavailable until surpassed. The sector chart explicitly covers measured runs, not old runs without splits. The total-time chart still shows the last 100 attempts.

The coach compares the current PB's sector gaps with all-time sector minima. Regularity uses coefficient of variation among the best measured runs (minimum three); this normalizes the unequal sector lengths. The ideal is explicitly theoretical, with random sequence difficulty noted. No paid AI services or new rendering loop are used.

## Backend deployment

Apply `backend/performance-sectors.sql` after the existing social installation, then deploy the updated `ten-shapes-social` Edge Function. Deploying/merging this branch alone does not apply SQL or deploy functions. The additive script is safe to rerun. No production database was modified by this work.

The new authenticated `performance_sectors` action accepts only the owner's already-completed server run, requires positive integer sectors whose sum matches the verified total, and rejects later changes. Per-level advisory locks serialize world comparisons. Direct anonymous/authenticated access to the table and RPC is denied; the existing Auth-checking Edge Function invokes it using service_role. A persisted server receipt alone enables fuchsia; offline runs never qualify. World verification is relative to measured runs submitted through this flow; older sector data does not exist. It inherits the current run validator's anti-cheat limits: client placement timestamps are not independently attested. This is not a new anti-cheat system.

Data has explicit player/run ownership for a future account sync. This change does not implement cross-device account registration or automatic restoration of local sector archives.

## Advertising integration

No banner is visible on the game screen, including preparation, countdown and final results. The existing reserved footer is visible on the analysis page. No AdMob native SDK or opportunity monitor is present in this repository revision. A `timeshapes:ad-screen` CustomEvent exposes `{screen, eligible, format: 'anchored-adaptive', opportunity}` only on actual screen/level transitions. It never refreshes an ad, loads an ad, or treats an opportunity as a delivered impression. The native host/monitor can consume this contract; native SDK integration remains outside this web repository.

## Validation

- `npm test`: 17 passed, including 3 new checks covering client sectors/legacy data and the SQL receipt flow.
- New client checks: exact sums, monotonic sampling, snapshot comparison through a new PB, independent minima from a slower run, five-run retention, 100-point history, legacy fallback, neutral ties.
- New SQL checks in PGlite: ownership, sum mismatch, idempotency, mutation rejection, world improvement versus tie, revoked public RPC/table access.
- Existing social, sharing, random-retry, ranking and nickname tests remain green.
- `git diff --check`: passed.
- `npm run test:ui`: blocked at browser launch (Playwright Chromium executable absent). Browser installation was attempted; download returned an invalid/truncated ZIP. Existing mobile UI tests were extended with sector-chart, history, overflow and ad-visibility checks but cannot be claimed passed.
- Android and iOS physical-device layout, WebKit, native anchored-adaptive rendering and timing under device load remain unverified. There is no new per-frame computation; only three constant-time timing samples per level, with storage/chart work after completion or when opening analysis.

Before release, apply the SQL/Edge Function changes and run browser/device QA. No game rules, shape selection or random retry sequence were intentionally changed.

## v0.21.37 — density view

The sector chart now uses one vertical violin per sector, based on available completed measured attempts belonging to the current player/level (plus deduplicated retained top runs). Width is a Gaussian kernel density estimate with a robust Silverman bandwidth and 40 ms minimum; each sector's width is independently normalized. At least five measured runs are required to draw density clouds; smaller samples show observed ranges only. Three selected-run markers are drawn above the clouds, with exact values below the axis. A selector includes the best retained runs and up to 100 recent available attempts, defaults to the PB, and opens the just-finished run when entered from results. The coach remains explicitly based on the PB and all-time personal minima. The independent 100-attempt total-time history remains unchanged. No network calls or per-frame work are introduced by this chart.

## v0.21.40 — all-time sector color reference

User-updated rule: finish colors compare each sector with its independent all-time personal minimum captured before that attempt, regardless of the best total run. Equal/faster is green; slower is yellow. First measured sectors establish green reference values. Analysis markers compare against current all-time personal sector minima, matching the ideal-time coach. Verified world receipts take priority as fuchsia; analysis trusts only newly marked verified receipts, rather than old archived flags created before competitive global-reference checks existed. Record totals and measured sector data are preserved.
