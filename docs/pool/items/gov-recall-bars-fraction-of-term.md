---
id: gov-recall-bars-fraction-of-term
title: "A recall bar stated as a fraction of the term is read as that fraction of the term at hand"
area: gov
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/data/campaigns/recall-bars.json stores every bar as days (openingDays, closingDays), with one longer value for terms over longTermAboveYears years, and `recallBarsFor` in src/core2/modules/recalls.ts picks between the two. A statute that bars a petition until a fraction of the term has been served (one-fourth of the term, in the row tagged ESTIMATED with stopgapId SG-GOV-recall-bars-term-fraction) cannot be stored that way: the row holds 183 days for a term of two years or less and 365 for a longer one, so it is exact for a two- or four-year term and 91 days long for a three-year term. Let a bar row state a fraction of the term (numerator and denominator, for the opening bar and for the closing bar), and have `recallBarsFor` turn it into days from the term at hand, preferably from the term's own start and end dates (`since` and `term.endDate` in `weighOrdinance`) rather than years times 365. Then retag that row SOURCED from its statute quote, drop its `longTermOpeningDays`, `estimatedFrom`, `spread` and `stopgapId`, and close SG-GOV-recall-bars-term-fraction.

**Rules.** One rule, all 56 places: a fractional bar is a per-place row in data that any place's statute can use, never a place named in logic or a branch for one term length. Replace, never layer: the two-band fields stay only for the bars that are really banded by term length, and the ESTIMATED tag, spread and note on the fractional row are deleted in the same change. Sliding scales and causes: the bar scales with the length of the term instead of switching at a term length.

**Done when.** A test in src/core2/recalls.test.ts asserts that a fractional row returns one-fourth of the term in days for terms of 2, 3 and 4 years (about 183, 274 and 365) and that a banded row still returns its two values; scripts/research/check-core-research.ts passes with the row SOURCED and recomputes the days from the fraction; and a one-year run of the played world (buildBenchWorld, a place whose bar is a fraction of the term, drawn from all 56 and named with its seed in the PR) shows a recall petition started no earlier than that fraction of the term after the term began, named by recall record id and the term's dates.

**Files.** src/core2/modules/recalls.ts, src/core2/recalls.test.ts, src/core2/data/campaigns/recall-bars.json, data/research/core/recall-timing-statutes-2026.json, scripts/research/check-core-research.ts, src/core2/data/stopgaps.json

**Notes.** Filed Oct 24, 2026 from the merger's send-back of PR 5853 (research-core-recall-petition-windows): the fractional bar was tagged SOURCED while the engine returned 365 days for a three-year term, so the row was retagged ESTIMATED with a 182 to 365 day spread. Today the place's council, mayor and county seats all take four-year terms, where the stored value is exact; the gap appears when a three-year term is read. The researcher left the engine untouched.
