---
id: gov-redistricting-cvap-and-language
title: "ACS citizen voting-age population and Section 203 language determinations by county, for the Voting Rights Act test"
area: gov
kind: research
priority: 3
size: S
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
after: gov-redistricting-neighborhood-data
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:13:25.999Z
---

**What.** The Voting Rights Act test counts citizen voting-age people, not all voting-age people, and the language-minority provisions use the Section 203 determinations by county. Add the ACS citizen voting-age population by race and Hispanic origin at the block group (the Census CVAP special tabulation) and the list of counties and the languages covered by Section 203, as data beside the neighborhood packs, so the map challenge can measure Gingles 1 on citizens.

**Rules.** Research before building: every figure cites its source and release. One rule, all 56 places; no field on any person. Estimate, never UNKNOWN: a block group the tabulation suppresses starts from its tract's share, marked ESTIMATED.

**Done when.** In a drawn state, the CVAP pack's block groups add up to the state's citizen voting-age population within the tabulation's margin, and the Section 203 list names the covered counties and languages, shown by a test in src/core2 (new).

**Files.** src/core2/data/neighborhoods/, src/core2/tooling/, src/core2/neighborhoods.ts

**Notes.** Split Oct 20 (claude/peaceful-ritchie-03780x) from gov-redistricting-neighborhood-data, which built the 2020 P.L. 94-171 block-group packs. The CVAP special tabulation is a Census download (2018 to 2022 ACS, block group) and the Section 203 list is a Federal Register notice; neither was fetched here.

Built Oct 20 (claude/peaceful-ritchie-03780x). CVAP: src/core2/tooling/build-cvap-packs.ts reduces the Census Bureau's 2019-2023 ACS citizen voting-age population special tabulation (www2.census.gov/programs-surveys/decennial/rdo/datasets/2023/2023-cvap/CVAP_2019-2023_ACS_csv_files.zip, BlockGr.csv, 407 MB, streamed) to 52 packs in src/core2/data/neighborhoods/cvap/: 242,336 block groups, each with citizen voting-age people and the Hispanic, White, Black, American Indian and Alaska Native and Asian parts (the remainder is other). Rounded to five, with sampling error: a block group's figure is rough, a district's sum is firm. Connecticut's 2019-2023 geography names its planning regions, so its block group ids differ from the 2020 files'. Section 203: src/core2/tooling/build-section-203.ts reduces the Census Bureau's December 2021 public use file (sect203_Determined_Areas_Only.csv) to src/core2/data/neighborhoods/section-203-2021.json: 301 counties, 87 minor civil divisions and 3 states, with each covered language, 334 distinct jurisdictions (331 plus 3 states, as the Census announced). src/core2/neighborhoods.ts adds `cvapUnits`, `section203Areas` and `section203Languages`; src/core2/neighborhoods.test.ts shows every state's citizen voting-age people between 75 and about 100 percent of its voting-age people (California lowest, near 84), the block groups matching the redistricting files, the 334 covered jurisdictions and Bernalillo County, New Mexico covered for Spanish and Navajo. The "tract share for suppressed units" rule is not needed: the tabulation has a figure for every block group.
