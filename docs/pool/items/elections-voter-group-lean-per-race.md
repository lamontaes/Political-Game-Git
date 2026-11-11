---
id: elections-voter-group-lean-per-race
title: "Keep each race's votes by kind of voter (age band, work, party side) so a neighbor can say who voted for the winner"
area: elections
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
lead: governing
source: words helper, race-told turnout (Nov 10)
---

**What.** The voting engine keeps a race's totals, turnout, eligible counts and (for a wider electorate) each place's votes, but no breakdown by kind of voter. The race-told scene can say a share, a turnout and a best place; it cannot say that "most of the young renters" or "the retirees" voted for the winner. A per-race breakdown by group, read from the same named and counted ballots the count already holds, would let a neighbor say who.

**Rules.** The breakdown is a read of the ballots the engine already decided by, not a new roll of dice; a counted group is read with the same rule as a full person, times its count (the one-model, two-tier rule).

**Done when.** A played race's result carries votes by group, and the race-told scene names a group for the winner, cited by record id.

**Files.** src/core2/modules/voting.ts, src/director/race-turnout-facts.ts

**Notes.** Evidence: src/director/race-told-scene.test.ts (Branchville, Virginia and Cleveland, Utah, Nov 10).

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have let a neighbor say which voter groups went for a candidate after a race; no ruling asks for it. The owner can ask for it back.
