---
id: people-views-opening-place-type-and-values-part-1-place-type-term
title: "Opening lean takes a place-type term from the Pew community-type shares"
area: people
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from people-views-opening-place-type-and-values in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term
---

**What.** Add a place-type term to a person's opening lean so a rural town opens more Republican-leaning and an urban one more Democratic-leaning, as the Pew 2024 community-type shares measure (urban counties 60% Democratic and 37% Republican, suburban 47% and 50%, rural a 25-point Republican edge; data/research/people/pew-partisanship-community-type-2023.json). The term is added for full people and, by the same rule, for counted residents (`countedLean`), so a counted resident opens where they will when filled in. Pew gives party identification, not the views scale, so the conversion to the views scale is the builder's work and is marked ESTIMATED with its source and spread. Seen: a rural town's voters leaning more Republican and an urban one's more Democratic, in the polls and on election night.

**Cause.** Found in code: `viewCell` and `openingLean` in src/core2/modules/views.ts (lines 236 and 381) read the CES cell by state, age band, education and faith and never the place type; the CES file src/core2/data/views/ces-2024-views.json carries a `byUrbanicity` key (city, suburb, town, rural) that nothing in src/core2 reads, and the Pew file is read by nothing in src/core2.

**Fix.** Read the place's type (urban, suburban or rural) from place data already in the repository (src/core2/data/places/), shift the opening lean by the converted Pew term in `openingLean`, and apply the same term in `countedLean`. If no place field gives the type, derive it from the place's population density and register the method as a stopgap naming what replaces it. Put the converted term in a parameter table row tagged ESTIMATED with the Pew source and its spread, and report the town's right and left shares beside the Pew shares for its type as figures to report, not a target.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a place with no type starts from the national average marked ESTIMATED with its source. One model, two tiers: the counted residents take the same term as full people, times their count. No dice: the term shifts the lean by a table value, never a roll. One rule, all 56 places: no state or town is named in the logic; the type comes from place data. Real data calibrates and never decides an outcome by itself (research before building).

**Done when.** A second session, in a one-year run of the played world (buildBenchWorld) in two drawn places of different place types from all 56 (place and seed named), finds each adult's opening view record naming its place-type term, a counted resident opening where the same person does when filled in (by record id), and the town's right and left shares reported beside the Pew shares for its type; src/core2/views.test.ts covers the term. **On screen.** Nothing yet: it would show on Politics, Campaigns and the election night results, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts, src/core2/data/views/views.json, src/core2/data/views/ces-2024-views.json, data/research/people/pew-partisanship-community-type-2023.json, src/core2/views.test.ts

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:58 UTC) on branch claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term.

Released (2026-11-11): Not built: changing openingLean/countedLean in views.ts moves every voter's opening view in all 56 places, and campaign-views personLean already re-ranks the town's adults to its area's 2024 vote share, so the place-type term's effect on polls and election night is unproven; needs the Pew-to-views-scale conversion (researcher skill, with fetched page and spread) and a place-type field check in src/core2/data/places/localities.json first. Cause confirmed: nothing in src/core2 reads byUrbanicity or the Pew file. Continue on branch claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:03 UTC) on branch claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term.

Released by next (2026-11-13): no push to claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term since 2026-11-11 02:58 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-people-views-opening-place-type-and-values-part-1-place-type-term.
