---
id: core-past-election-tie-small-town
title: "A prior election in a town of a few voters ends in a tie, so it has no winner (seed 7ee004c2ea587a2e)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/past-election-tie
pr: #4830
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:29:35.956Z
---

**What.** The past module draws each prior election's votes as the winner's share (at least 0.505) of the town's ballots, rounded. In a town with a handful of ballots the rounding makes a tie: 8 ballots at 0.505 give 4 votes to the winner and 4 to the challenger, so `src/core2/past.test.ts` "seats every elected officeholder by an election with votes that add up" fails ("expected 4 to be greater than 4") for a seed (7ee004c2ea587a2e, place 2003675) and a winner who did not win is on the record. The winner now takes the larger of the rounded share and a strict majority of whole ballots, and each candidate's share is its votes over the ballots.

**Rules.** The winner won: more than half of whole votes. One rule, all 56 places. Replace, never layer.

**Done when.** In the played world (the past test with PAST_SEED 7ee004c2ea587a2e, place 2003675) every prior election's winner has more votes than the challenger and the votes add to the total, and the past test passes.

**Files.** src/core2/past-elections.ts

**Notes.** Found by running all of src/core2 on main (Oct 16).
