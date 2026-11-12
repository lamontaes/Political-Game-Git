---
id: release-main-red-press-test-opening-day
title: "press.test is red on main at every seed: the outside candidate is looked for before the first day files them, and the race case picks a relative from another state on one day"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-press-test
pr: 8909
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
source: Red desk, Nov 12 (Fable A's handoff on #7365)
---

**What.** src/core2/press.test.ts fails on clean main beffd5d9 at every seed drawn (ed7a33fc..., 046551a4..., 294e45a0...): "No town interviewed an outside candidate" in all 16 places of every draw, and at 046551a4... "no town with a local outlet and a race" in all 8 places. Guards: the press desk's interview of state and federal candidates keeps its check.

**Cause.** Found in code: (1) #8541 moved the parties' stand-in nominees for a race whose filing closed before the record began from openVoting to the first candidacy day (`closeAtOpening` in src/core2/modules/voting.ts, called from `candidacyDay` in src/core2/modules/candidacy.ts); the test opens the world and never plays a day, so no filing exists (0 filings in Iowa 1932790, Oklahoma 4059750 and New York 3622832). On #8541's parent it passes at both seeds. (2) The race case picks the richest adults from every person the core keeps, which now includes relatives living in other states; the clerk refuses them on residency ("lives elsewhere", New Mexico 3562760). It also looks only on January 5, when most places have no filing window open (0 open contests in 7 of 8 places at 046551a4...).

**Fix.** Test only, no assertion changed. The outside case plays the opening day, as the played world does. The race case takes its candidates from the town's own residents (lawChain townPlaceId) and waits in each drawn place a week at a time, up to the last filing deadline its calendar holds, until a race takes both filings, naming what it passed over (drawn-place-tests).

**Time box.** 2 hours

**Rules.** One rule, all 56 places: the test keeps drawing from all 56 and waits in each drawn place instead of pinning one. Fix the cause, not the test: no loosened assertion, no skip, no early return.

**Done when.** A second session runs press.test.ts on main in the drawn place each run names, with GOLDEN_PATH_SEED=ed7a33fcb2e87e4d76f3e65533d84b26c4edde490042b5cd3652ba094ad86dd2 and with two fresh seeds, and all three cases pass in the places each names.

**Waits on.** Nothing.

**Files.** src/core2/press.test.ts
