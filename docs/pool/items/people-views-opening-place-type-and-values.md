---
id: people-views-opening-place-type-and-values
title: "Opening views read the kind of place a person lives in and form the 14 values"
area: people
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on: people-views-opening-place-type-and-values-part-1-place-type-term, people-views-opening-place-type-and-values-part-2-the-14-values, people-views-opening-place-type-and-values-part-3-values-answer-key
source: added with npm run pool -- add
after:
lead: governing
model: sonnet
effort: low
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The opening view of each person in `src/core2/modules/views.ts` is read from the CES 2024 cell for their state, age band, education and faith plus a household share, but not from the kind of place they live in, and the 14 values (limited government, collective provision and the rest, listed in docs/packages/M1-views.md) are formed for nobody. Pew's 2024 report on partisan coalitions measured the place-type gap among registered voters: urban counties 60% Democratic and 37% Republican, suburban counties 47% and 50%, rural counties a 25-point Republican edge (data/research/people/pew-partisanship-community-type-2023.json). The opening lean should take a place-type term converted from those shares, and each adult should open with the 14 values formed from their own records. Counted groups carry the same terms and values, times their count. The item is split into three parts, built in order.

**Cause.** Found in code: `viewCell` and `openingLean` in src/core2/modules/views.ts (lines 236 and 381) read the CES cell by state, age band, education and faith from src/core2/data/views/ces-2024-views.json and never the place type (that file's `byUrbanicity` key is read nowhere in src/core2); the Pew file data/research/people/pew-partisanship-community-type-2023.json is read by nothing in src/core2, and no module forms the 14 values (the open stopgap SG-P15-views-first-version in src/core2/data/stopgaps/p15.json says so).

**Fix.** Done through the three parts: add a place-type term to the opening lean (part 1), form the 14 values for each adult from their own records with reasons (part 2), and check the values against a sourced answer key with the counted groups carrying the same terms (part 3). This parent closes when the three parts are merged and the stopgap row SG-P15-views-first-version is resolved or narrowed by them.

**Time box.** 2 hours for one Sonnet session, only to confirm the three parts' finish line. When it runs out, write what was seen in the item and stop.

**Rules.** Estimate, never UNKNOWN: a place-type or value cell the survey lacks starts from the national average marked ESTIMATED with its source and spread. One model, two tiers: the counted groups carry the same place-type term and values as full people, times their count. No dice: values follow the person's records and the researched weights, never a roll. One rule, all 56 places: no state, town or party is named in the logic.

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld, two drawn places from all 56 of different place types, place and seed named), sees every adult's opening view record name its place-type term and carry the 14 values with their reasons by record id, the three parts merged, and src/core2/views.test.ts passing. The town's right and left shares are reported beside the Pew shares for its type as figures to report, not a pass or fail. **On screen.** Nothing yet: it would show on Politics, Campaigns and the election night results, and nothing there reads it.

**Waits on.** The three parts, in order: people-views-opening-place-type-and-values-part-1-place-type-term, then part-2-the-14-values, then part-3-values-answer-key.

**Files.** src/core2/modules/views.ts, src/core2/data/views/views.json, data/research/people/pew-partisanship-community-type-2023.json, src/core2/views.test.ts

**Notes.** TODO
