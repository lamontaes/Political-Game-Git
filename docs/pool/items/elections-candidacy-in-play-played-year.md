---
id: elections-candidacy-in-play-played-year
title: "candidacy-in-play.test plays its own year at module level (588 s of import at West Wendover)"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/candidacy-in-play.test.ts builds a bench world and plays a year at module level, outside any test, so its import took 588 s at West Wendover NV (seed f24b370d1a4c2d35), close to the 600 s line past which merge desks send heavy tests back. The weighing test's own loop was quadratic and is fixed in PR #7986; the year is the remaining cost.

**Rules.** Share one played world with the other path tests that play the same span, or play a shorter span that still holds a filing day and a general election; do not raise a timeout or skip the test. One engine: the test reads the world the game plays.

**Done when.** At West Wendover NV (3283730, PW3_SEED=f24b370d1a4c2d35) the file's import plus tests finish in under 300 s with the same assertions (all four tests), and the number is stated for two other drawn places with their seeds.

**Files.** src/core2/candidacy-in-play.test.ts

**Notes.** Elections, Nov 9: the Coordinator asked for this item after PR #7986. No existing item covers it (searched docs/pool/items for candidacy-in-play).
