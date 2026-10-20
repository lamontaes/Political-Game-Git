---
id: gov-redistricting-cvap-and-language
title: "ACS citizen voting-age population and Section 203 language determinations by county, for the Voting Rights Act test"
area: gov
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: gov-redistricting-neighborhood-data
source: added with npm run pool -- add
---

**What.** The Voting Rights Act test counts citizen voting-age people, not all voting-age people, and the language-minority provisions use the Section 203 determinations by county. Add the ACS citizen voting-age population by race and Hispanic origin at the block group (the Census CVAP special tabulation) and the list of counties and the languages covered by Section 203, as data beside the neighborhood packs, so the map challenge can measure Gingles 1 on citizens.

**Rules.** Research before building: every figure cites its source and release. One rule, all 56 places; no field on any person. Estimate, never UNKNOWN: a block group the tabulation suppresses starts from its tract's share, marked ESTIMATED.

**Done when.** In a drawn state, the CVAP pack's block groups add up to the state's citizen voting-age population within the tabulation's margin, and the Section 203 list names the covered counties and languages, shown by a test in src/core2 (new).

**Files.** src/core2/data/neighborhoods/, src/core2/tooling/, src/core2/neighborhoods.ts

**Notes.** Split Oct 20 (claude/peaceful-ritchie-03780x) from gov-redistricting-neighborhood-data, which built the 2020 P.L. 94-171 block-group packs. The CVAP special tabulation is a Census download (2018 to 2022 ACS, block group) and the Section 203 list is a Federal Register notice; neither was fetched here.
