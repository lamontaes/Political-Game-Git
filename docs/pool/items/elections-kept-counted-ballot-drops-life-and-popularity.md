---
id: elections-kept-counted-ballot-drops-life-and-popularity
title: "A kept counted ballot is read back without the voter's life stake and the country's view, so its split disagrees with its own appeal"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-kept-life
pr: #9566
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (seen while gating #9550)
---

**What.** src/core2/two-level-elections.test.ts is red on the clean train (892427ec, and 29ef4685 at tl-a and tl-d) at every seed tried: `GOLDEN_PATH_SEED=tl-a` (New Mexico, U.S. Senate), `tl-b` (Utah, State House district 75), `tl-c` (Vermont, Governor), `tl-d` (Wyoming, Governor). A kept counted ballot's people are counted for one candidate while the appeal read back from the same kept row puts another first ("expected 1 to be close to +0" or "expected +0 to be close to 1"). On a ballot without party labels the share is off by a few thousandths instead. Seen: a counted ballot's reasons in dev mode's Records name a different first candidate from the one its people were counted for.

**Cause.** Found in code: on the train at 892427ec (and 29ef4685) the count reads each counted voter's stance through `countedStanceProfile` (src/core2/modules/views.ts), which carries `seed` (the world's country view of each question, `popularity`) and `life` (their household's stake, `stakeShift`). `groupStance` in src/core2/campaign-views.ts adds both. The kept row (`kept` in `holdCountedElection`, src/core2/modules/voting.ts) keeps only faith and degree, and `keptProfile` rebuilds a profile from those alone, so `countedBallotAt` reads every kept ballot without the popularity and stake terms. The appeal it shows is not the appeal the vote used, and where those terms moved a voter's first place the record's split and its shown reasons disagree. #9550 keeps the heard term the same way and is not the cause: the same seeds fail at the same voters with and without it.

**Fix.** Keep what the vote read. The row keeps the world's seed once (every voter on it shares it) and each voter's life stake as the count read it (its six facts and how much they care, or null), and `keptProfile` carries both, so `countedBallotAt` reads the same `groupStance` the count did. A row kept before the columns existed reads without them, as now. No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted ballot's reasons are the reasons it was cast for, read by the same rule as a full person's. Never loosen a test to get green.

**Done when.** two-level-elections no longer fails its kept-split check at `GOLDEN_PATH_SEED` tl-a, tl-b, tl-c and tl-d, where it fails on the train without the fix, and passes whole where no other fault stops it first; a second session, on the train or main in a drawn place it names with its seed, opens a counted ballot's reasons in dev mode and sees the candidate the record's people were counted for first in its appeal.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/views.ts, src/core2/two-level-elections.test.ts

**Notes.** Nov 15 (counted-carry thread): not the cause of tests-counted-vote-share-split-first-place-glencoe; that test stays red at 3e755ead4b7c2887 and b1c797aabcbd8a47 with this fix. With the split check passing, two-level-elections stops on two older faults the split check hid, red the same way on the train with that check skipped: tests-two-level-ticket-office-kept-ballots (tl-a, tl-b, tl-e) and elections-decided-seat-opens-no-next-contest (tl-c).
