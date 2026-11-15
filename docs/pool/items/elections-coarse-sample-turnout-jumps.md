---
id: elections-coarse-sample-turnout-jumps
title: "Another state's race counted from the town's sample moves its turnout by a twentieth when three townspeople are filled in"
area: elections
kind: bug
priority: 2
size: M
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
source: views thread, Nov 15 (measured while answering the Account lead on the counted-carry change)
---

**What.** A race the town does not vote in (another state's special election, or a seat counted coarsely) is counted from 400 of the town's counted adults, evenly spaced along the lean order. When one household leaves the counts, every pick after it moves to a different person, and the race's turnout moves with that person's readiness. At Marshfield, Massachusetts (2538820), seed speed-carry-a, an aide hire on Dec 16, 2025 came with three counted adults filled in that day. The New Jersey lower 3 special on Dec 20 then cast 11,987 votes instead of 12,736, and the Democratic share went from 64.8% to 62.4%, with the same candidates and the same reasons. Seen: other states' special election results on the news and in dev mode.

**Cause.** Found in code: `coarseSample` in src/core2/electorate.ts takes `coarseSampleVoters` (400) evenly spaced picks from `electorateSample` (voting.ts, line 4760), and each pick stands for the place's eligible voters over 400. Readiness differs a lot between neighbors in the lean order. So a pick landing on a different neighbor changes the place's turnout by that difference times a four-hundredth of the place. Measured: the sample held 3,728 records without the fill-ins and 3,725 with them, and its mean readiness was −0.2502 against −0.2505. The race's turnout moved 5.9%. The parameter's check (`coarseSampleVoters` in src/core2/data/electorate/parameters.json) covers the state's two-party share only, not turnout.

**Fix.** Let each of the 400 picks stand for every record in its stretch of the lean order: the pick's turnout is the weighted mean of its records' turnout by the one turnout rule, read once per day, so one record leaving moves its stretch by its own weight. Measure turnout before and after one household is filled in, and the election day's time, at two named places, and keep the change only if the day's time holds within the speed rule.

**Time box.** 4 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted record's voters turn out by the same rule as a named voter, times its weight. No dice. Speed: no change makes a year more than 20% slower.

**Done when.** Filling in one household moves a coarsely counted race's turnout by no more than that household's share of the town's counted adults, at Marshfield (2538820, seed speed-carry-a) and one drawn place named in the PR. A second session sees the New Jersey lower 3 special's result in dev mode on the train or main.

**Waits on.** Nothing.

**Files.** src/core2/electorate.ts, src/core2/data/electorate/parameters.json

**Notes.** Nov 15 (views thread): the three adults were filled in by `core2-staff-v1` (staffer person_4733ee348ca84c78, hired Dec 16 from applicants, and two more adults, a couple, filled in the same day). The heard term itself is never read for these races: `countPlaces` calls `countedAppeal` with no stance profile.
