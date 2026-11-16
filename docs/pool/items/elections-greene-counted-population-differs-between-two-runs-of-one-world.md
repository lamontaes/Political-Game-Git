---
id: elections-greene-counted-population-differs-between-two-runs-of-one-world
title: "Two runs of one drawn world read 180 and 556 counted eligible voters in the same race, only campaigning differing"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (new-player race trace)
---

**What.** At Greene, Maine (`drawPlace("jpr-pin:0", "journal-player-race:0")`) the same new life was played to the county board race twice: once with the player canvassing and raising money every week, once with the player doing only the petition. The result record reads 180 counted eligible voters and 91 counted turnout in the first run and 556 and 325 in the second, with totals of 10,130 and 15,921 votes. The player's share barely moved (48.6% and 48.1%), so the finding is about the count and not about the winner. A world that reads a different electorate in the same race depending on what the player did, by a factor of three, undermines every pinned test and every comparison between two runs. Seen: the Results screen's turnout line for a race reads a different figure in two runs of one place.

**Cause.** Measured: seed `jpr-pin:0` (Greene ME, world seed 6d08a7af3f4814cb698e6be125b1749f5116d0350e8ed73cd99f5ca94df882ed), script `.walk/trace.ts jpr-pin:0 1 0` against `.walk/trace.ts jpr-pin:0 0 0` on the Train 892427ec15, `countedEligible` and `countedTurnout` on the result record `result:contest:seat:gus2025:166150:board:0:2026-11-03`. Not read: which of the two is the right size and why they differ. The first suspect is the player's door canvass filling counted residents in as named people (at most 1 or 2 per outing, `fillCounted`), which moves them out of the counted group, but 99 outings cannot move 376 and the second run has no outings after the petition, so this is a guess and not a cause.

**Fix.** Needs cause. Read `countedAdultsToday` and the counted ballots' rolls at the count in both runs and name what changed the size; do not add a cap or a floor.

**Time box.** 3 hours for one Opus session.

**Rules.** Wire to the world (`wire-to-the-world`): the size of an electorate follows the town's records, never a run's own history. One model, two tiers (`one-model-two-tiers`): a counted group is read by every engine the same way whoever acted.

**Done when.** A second session plays a drawn place named with its seed on main twice to one election, once with weekly campaigning and once without, and reads the same counted eligible figure from both result records, or the item's Notes name the record that explains each difference.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/campaigns.ts

**Notes.** Account lead, Nov 15. The other four places read in the trace (Lisbon ND, Durham OR, Arthurdale WV, New Llano LA) show counted eligible 1,414 and 1,501, 1,053 and 1,137, 239 and 653, 1,183 and 1,279 across the two runs: also different, by smaller shares. Whether the same cause covers them is unread.
