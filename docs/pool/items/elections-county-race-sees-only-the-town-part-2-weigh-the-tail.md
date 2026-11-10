---
id: elections-county-race-sees-only-the-town-part-2-weigh-the-tail
title: "County challengers weigh the seat by the same reasons"
area: elections
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after: elections-county-race-sees-only-the-town-part-1-seeded-county-tail
blocked-on:
lead: governing
model: opus
effort: high
root: design-one-model-two-tiers
source: split from elections-county-race-sees-only-the-town in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Once the county's people exist (part 1), the county seat has to be weighed by them. Today a county contest is weighed by the town's people alone. A county contest should draw challengers from the whole county on the same chooser's reasons, and the one drawn to run is filled in as a full person, seeded so the same person returns.

**Cause.** Found in code: `weighContest` (`src/core2/modules/candidacy.ts` line 880) weighs only the town's adults and counted records for a county seat; `candidacyCountywideWeight` lowers the pull by 0.5 (line 544).

**Fix.** Have the generated county tail from part 1 weigh a county seat by the same reasons as the town's counted records, weigh only as many people as a seat's tail needs, and fill one in as a full person when drawn to run.

**Time box.** 6 hours for one Opus session.

**Rules.** One model, two tiers: the rest of the county is counted on the same engine as the town's counted residents (re-placed records weighted to the county's eligible voters, as countPlaces does), never a second model. No dice: a challenger from elsewhere in the county runs on the same chooser's reasons; real shares check totals only. Two-level population: a challenger from the rest of the county is filled in as a full person only when drawn to run, seeded so the same person returns. One rule, all 56 places: county facts come from data.

**Done when.** A second session plays a world in six places drawn from all 56 (names and seeds printed) and finds county contests drawing at least one candidate who lives elsewhere in the county, filled in from the county tail, with the reasons recorded by record id. It reports the pooled share of county contests with one candidate or none beside BallotReady's figure, as a check and not a target.

**Waits on.** Part 1 (elections-county-race-sees-only-the-town-part-1-seeded-county-tail).

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/data/candidacy/parameters.json

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would let the county tail weigh county seats; no screen shows the difference, and the parent is dropped.
