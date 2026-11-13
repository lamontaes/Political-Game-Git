---
id: elections-county-race-sees-only-the-town-part-1-seeded-county-tail
title: "The rest of the county is generated from counted records"
area: elections
kind: feature
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: design-one-model-two-tiers
source: split from elections-county-race-sees-only-the-town in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The rest of the county is counted coarsely for statewide races but has no people who could run for the county's own seats. A few hundred town records cannot stand for the tail of a county of tens of thousands. This part generates the county's people like each counted record with their own seeded temperament, as generation of who exists.

**Cause.** Measured: step B on governing/county-challengers (df3dcf3cf9) gave no one in Pigeon Falls, Wisconsin and Mulford, Colorado (run seed ccb-1): no counted record clears the stay-out bar even for a town seat (strongest pulls 3.03 and 3.41 against 3.94), because a few hundred records cannot stand for the tail of a county of tens of thousands. Found in code: `weighContest` in `src/core2/modules/candidacy.ts` (line 880) and `countPlaces` in `src/core2/electorate.ts` (line 998).

**Fix.** Generate the county's people like each counted record, each with their own seeded temperament, as counted rows keyed by place record id. Do not weigh them yet (part 2).

**Time box.** 5 hours for one Opus session.

**Rules.** One model, two tiers: the rest of the county is counted on the same engine as the town's counted residents (re-placed records weighted to the county's eligible voters, as countPlaces does), never a second model. No dice: a challenger from elsewhere in the county runs on the same chooser's reasons; real shares check totals only. Two-level population: a challenger from the rest of the county is filled in as a full person only when drawn to run, seeded so the same person returns. One rule, all 56 places: county facts come from data.

**Done when.** A second session builds a world in a drawn place with a county (name and seed written down) and finds the rest of the county generated from counted records with seeded temperaments, listed by place record id, summing to the county's eligible voters. The same place and seed give the same rows again.

**Waits on.** Nothing.

**Files.** src/core2/electorate-places.ts, src/core2/race-places.ts, src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would generate the rest of a county as people who could run; nobody sees them, and the parent is dropped.
