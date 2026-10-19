---
id: gov-two-level-governor-share-flaky
title: "two-level-elections.test.ts fails one run in five in a random place: the Governor's share is 0.153, over the 0.15 bound"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4861
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `src/core2/two-level-elections.test.ts` fails about one run in five in a random place: the Governor's share is 0.153, over the 0.15 bound the test sets. The bound was chosen on a few places and the share depends on the drawn place's electorate and the nominees. Pull request 4861 changes the test, not the game. The question to settle is whether the share should sit within 0.15 of the state's presidential split in every place, or whether the bound is too tight for the places where the spread of voters is wide.

**Rules.** Estimate, never UNKNOWN: a bound on a share starts from the real spread of governor results against the presidential split, marked ESTIMATED with its source. One rule, all 56 places: the test names the place and seed.

**Done when.** The test passes in at least twenty drawn places from all 56 (place and seed named in the output) with a bound taken from the real spread of governor results against the state's presidential split, and the pull request shows the spread it used.

**Files.** src/core2/two-level-elections.test.ts

**Notes.** Body repaired Oct 17 (claude) from the pull request's description; the fix is in that pull request.

Sent back 2026-10-19 from PR #4861 (branch claude/governor-share-flaky): Morning check: src/core2/two-level-elections.test.ts loosens the statewide-executive vote-share assertion from <0.15 to <0.2. The merger rules explicitly refuse tests that are loosened; fix the model or preserve an equally strong invariant; finish on that branch, merge main into it first.
