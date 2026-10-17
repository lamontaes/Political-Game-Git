---
id: gov-two-level-governor-share-flaky
title: "two-level-elections.test.ts fails one run in five in a random place: the Governor's share is 0.153, over the 0.15 bound"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found in #4859, Oct 17
---

**What.** `src/core2/two-level-elections.test.ts` ("counted residents vote, challengers get real votes, and statewide results track the state") fails about one run in five in a random place with "Governor: expected 0.1534 to be less than 0.15". Find which share the assertion bounds (a challenger's, or the gap to the state) and whether the bound or the counted vote is wrong in that place.

**Rules.** No dice: a vote comes from a voter's records, never a roll. Real rates check totals only. One rule for all 56 places.

**Done when.** The test passes in ten drawn places in a row, and the PR body names the failing place and seed and the record that moved the share.

**Files.** src/core2/two-level-elections.test.ts, src/core2/modules/voting.ts

**Notes.** Seen on main with and without the ward residency change (#4859). The place and seed were not printed by the failing run; print them in the assertion message first.
