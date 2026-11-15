---
id: elections-kept-counted-ballot-drops-life-and-popularity
title: "A kept counted ballot is read back without the voter's life stake and the country's view, so its split disagrees with its own appeal"
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
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (seen while gating #9550)
---

**What.** src/core2/two-level-elections.test.ts is red on the clean train (892427ec) at every seed tried: `GOLDEN_PATH_SEED=tl-a` (New Mexico, U.S. Senate), `tl-b` (Utah, State House district 75), `tl-c` (Vermont, Governor), `tl-d` (Wyoming, Governor). A kept counted ballot's people are counted for one candidate while the appeal read back from the same kept row puts another first ("expected 1 to be close to +0" or "expected +0 to be close to 1"). On a ballot without party labels the share is off by a few thousandths instead. Seen: a counted ballot's reasons in dev mode's Records name a different first candidate from the one its people were counted for.

**Cause.** Found in code: on the train at 892427ec the count reads each counted voter's stance through `countedStanceProfile` (src/core2/modules/views.ts), which carries `seed` (the world's country view of each question, `popularity`) and `life` (their household's stake, `stakeShift`). `groupStance` in src/core2/campaign-views.ts adds both. The kept row (`kept` in `holdCountedElection`, src/core2/modules/voting.ts) keeps only faith and degree, and `keptProfile` rebuilds a profile from those alone, so `countedBallotAt` reads every kept ballot without the popularity and stake terms. The appeal it shows is not the appeal the vote used, and where those terms moved a voter's first place the record's split and its shown reasons disagree. #9550 keeps the heard term the same way and is not the cause: the same seeds fail at the same voters with and without it.

**Fix.** Keep what the vote read. The row keeps the world's seed once (every voter on it shares it), and for each voter the life stake's shift on each question the field's platforms take a side on, kept the way #9550 keeps `heard` (a record of question to shift, or null when the stake moves nothing); `keptProfile` carries both, so `countedBallotAt` reads the same `groupStance` the count did. A row kept before the columns existed reads without them, as now. No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted ballot's reasons are the reasons it was cast for, read by the same rule as a full person's. Never loosen a test to get green.

**Done when.** two-level-elections passes at `GOLDEN_PATH_SEED` tl-a, tl-b, tl-c and tl-d and at two more seeds named in the PR; a second session, on the train or main in a drawn place it names with its seed, opens a counted ballot's reasons in dev mode and sees the candidate the record's people were counted for first in its appeal.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/views.ts, src/core2/two-level-elections.test.ts

**Notes.** Nov 15 (counted-carry thread): likely the same cause as tests-counted-vote-share-split-first-place-glencoe, not yet shown.
