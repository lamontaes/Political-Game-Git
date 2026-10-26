---
id: tests-played-world-counted-change-tiny-place
title: "The played-world check fails a place whose counted population is a handful of people with no birth, death or move in the year"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/counted-change-expected-events
pr: #6068
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T23:46:25.296Z
---

**What.** The played-world check 'the counted population changes' (tests/golden-path/played-world.node-test.ts, break 12) fails when the counted population's change, counted births and counted moves are all zero. In Warm River, Idaho (place 1685420, seed 5425839f30ad0ba268c9a7f86dfd1025a407f96e31e7e8fba692ee4f5be473fe, drawn by golden-path-year from commit 2084c96f1c) only 3 people are counted, and none was born, died or moved in the year, so the check reports BROKEN. Clean main 9309c337ce fails the same place and seed the same way, and it turned the word pack's golden-path-year red.

**Rules.** Sliding scales and causes: a town of three can go a year without a birth, death or move, so the check must judge the counted engine by its rates against the counted population (expected events), not by whether one happened. One rule, all 56 places: no place is named in the check; the size threshold comes from the expected-event count.

**Done when.** tests/golden-path/played-world.node-test.ts passes on the Warm River seed above and still fails when the counted engine is switched off in a drawn place whose expected counted events for the year are well above one (seed named), shown by the test's own output. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/residents.ts, src/core2/modules/renewal.ts

**Notes.** Sent back 2026-10-25 from PR #6068 (branch claude/counted-change-expected-events, checked 08d042ca05): its own Hartland evidence says disabling counted births, deaths and moves still passes because other flows change the count; forcing the checker readings to zero does not satisfy the disabled-engine Done-when. Keep checker observations unchanged and prove the real negative control alongside the same-root positive world; finish on that branch, merge main into it first. No completed local green test gate was claimed.
