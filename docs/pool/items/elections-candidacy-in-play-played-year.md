---
id: elections-candidacy-in-play-played-year
title: "candidacy-in-play.test plays its own year at module level (588 s of import at West Wendover)"
area: elections
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** `src/core2/candidacy-in-play.test.ts` builds a bench world and plays a year at module level, outside any test, so its import took 588 seconds at West Wendover, Nevada (seed f24b370d1a4c2d35), close to the 600-second line past which merge desks send heavy tests back. The weighing test's own loop was quadratic and is fixed in #7986; the played year is the remaining cost. Share one played world with the other path tests that play the same span, or play a shorter span that still holds a filing day and a general election, and keep all four tests.

**Cause.** Found in code: `src/core2/candidacy-in-play.test.ts` builds a bench world and plays a year at module level (lines 42 to 82, outside any `it`). Measured: its import took 588 seconds at West Wendover, Nevada (3283730, PW3_SEED=f24b370d1a4c2d35).

**Fix.** Share one played world with the other path tests that play the same span, or play a shorter span that still holds a filing day and a general election. Keep all four tests and raise no timeout.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Speed: one played world is shared, not rebuilt per file; no timeout is raised and no test is skipped. One engine: the test reads the world the game plays. One rule, all 56 places: the test names the place and seed it drew.

**Done when.** A second session runs `src/core2/candidacy-in-play.test.ts` at West Wendover, Nevada (3283730, PW3_SEED=f24b370d1a4c2d35) and the file's import plus tests finish with all four tests and the same assertions. It states the time for two other drawn places with their seeds, and the file's cost is lower than 588 seconds at each.

**Waits on.** Nothing.

**Files.** src/core2/candidacy-in-play.test.ts

**Notes.** Elections, Nov 9: the Coordinator asked for this item after PR #7986. No existing item covers it (searched docs/pool/items for candidacy-in-play).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would cut a test's import time from 588 seconds; no player sees test time.
