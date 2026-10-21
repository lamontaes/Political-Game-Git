---
id: core-speed-director-watch-all-slow
title: "With every person watched, the director runs about 100 times slower than before"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/stories-from-engines.test.ts times out at its 30-minute limit on main (Coventry, Vermont, seed 0fc1c044eef41a1c22a597a9d1846533367bca84). With all 1,720 people watched, the first 30 days took about 8 seconds on #5336's branch before it merged main (about 50 seconds for a year) and 834 seconds on plain origin/main with the same script. Something main added since makes watching everyone scan far more per day.

**Rules.** Speed: a town's game year must run in under two minutes, and no change may make a year more than 20 percent slower than its base; never scan the whole world or history every day; use indexes or act on the day something changed. Measure one process at a time on the same machine.

**Done when.** On main, the Coventry, Vermont seed above runs its first 30 days with every person watched in under 15 seconds, measured before and after on the same machine; the slow function is named by profile in the PR body; stories-from-engines.test.ts passes within its limit.

**Files.** src/director/, src/core2/

**Notes.** TODO
