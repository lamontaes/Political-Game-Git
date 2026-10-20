---
id: release-core2-tests-time-out-on-small-container
title: "Seven core2 played-world tests time out at 2 workers on a 4-core container: estate-contracts, groundwater-law, housing-laws, income-tax-played, moves-cash, office-proof, paid-leave"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/core2-test-timeouts
pr: #5344
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:33:12.812Z
---

**What.** Ten core2 tests time out when the whole directory runs two workers at a time on a 4-core cloud container: estate-contracts (46 s), groundwater-law (298 s), housing-laws (261 s), income-tax-played (334 s), moves-cash (1,045 s), office-proof (506 s) paid-leave (389 s), scandal-term (49 s), vote-level (30 s) and world-legislating (33 s). Each passes when run alone with a larger heap, so these may be slow rather than wrong. Time each alone on the same machine and either speed up the slow ones or give them an honest per-test timeout.

**Rules.** Speed: a game year must run in under two minutes and no change may make it more than 20 percent slower; measure before and after on the same machine, one process at a time. Replace, never layer: a slow test is made fast or given a stated timeout, never skipped.

**Done when.** Each of the ten passes inside the test's own timeout when run alone in a drawn place (name and seed in the PR body), with the time of each measured before and after, and src/core2 runs in chunks without a timeout.

**Files.** src/core2/estate-contracts.test.ts, src/core2/groundwater-law.test.ts, src/core2/housing-laws.test.ts, src/core2/income-tax-played.test.ts, src/core2/moves-cash.test.ts, src/core2/office-proof.test.ts, src/core2/paid-leave.test.ts, src/core2/scandal-term.test.ts, src/core2/vote-level.test.ts, src/core2/world-legislating.test.ts

**Notes.** Found by running src/core2 in chunks of 12 files, two workers, on main, Oct 19 (release-suite-red-list-on-main). Not yet confirmed one at a time, so the next builder runs each alone first.
