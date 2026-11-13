---
id: elections-county-race-sees-only-the-town-part-3-refit-the-weight
title: "Refit or remove the countywide weight"
area: elections
kind: cleanup
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after: elections-county-race-sees-only-the-town-part-1-seeded-county-tail, elections-county-race-sees-only-the-town-part-2-weigh-the-tail
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: split from elections-county-race-sees-only-the-town in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The countywide weight exists because only the town weighed county seats. Once the county tail weighs them (parts 1 and 2) the weight should be refit against what the county shows, or removed. A test must fail when the rest of the county is taken out, so the county cannot silently go back to the town alone.

**Cause.** Found in code: `candidacyCountywideWeight` (`src/core2/modules/candidacy.ts` line 544) lowers a county seat's pull by 0.5 because only the town weighed it; once the county itself weighs its seats the discount has no reason.

**Fix.** Refit `candidacyCountywideWeight` against the county's own weighing, or remove it, and add a test that fails if the rest of the county is removed.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Replace, never layer: the old weight is deleted or refit in the same change, not kept beside a second discount. One model, two tiers: the rest of the county is counted on the same engine as the town's counted residents (re-placed records weighted to the county's eligible voters, as countPlaces does), never a second model. No dice: a challenger from elsewhere in the county runs on the same chooser's reasons; real shares check totals only. Two-level population: a challenger from the rest of the county is filled in as a full person only when drawn to run, seeded so the same person returns. One rule, all 56 places: county facts come from data.

**Done when.** A second session plays a world in a drawn place (name and seed written down) and finds `candidacyCountywideWeight` removed or refit with its tag and spread, and a test that fails when the rest of the county is removed. County contests still draw candidates from elsewhere in the county, by record id.

**Waits on.** Parts 1 and 2 (elections-county-race-sees-only-the-town-part-1-seeded-county-tail, elections-county-race-sees-only-the-town-part-2-weigh-the-tail).

**Files.** src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json, src/core2/county-race-county-votes.test.ts

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would refit the countywide weight once the county tail exists; the tail is dropped, so there is nothing to refit.
