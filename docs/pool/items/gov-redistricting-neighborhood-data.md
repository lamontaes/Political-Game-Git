---
id: gov-redistricting-neighborhood-data
title: "Neighborhood make-up by block group, compiled from Census data with no field on any person"
area: gov
kind: research
priority: 3
size: M
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:01:59.913Z
---

**What.** Compile neighborhood make-up from Census P.L. 94-171 block-group counts (total and voting-age population by race and Hispanic origin), ACS citizen voting-age population and the Section 203 language determinations by county, into per-state packs loaded on demand like map geometry. Each unit carries its place and district joins; unread units are estimated from similar units in the state and marked ESTIMATED. No field is added to any person.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** The pack totals match the shipped place populations, in a drawn state, by a test in src/core2 (new); grep finds no race or language field on Person.

**Files.** data/source/, src/districts/, src/core2/tooling/

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

Checked Oct 20 (claude/peaceful-ritchie-03780x) before building: the Census Data API now answers every request without a key with a redirect to a "Missing Key" page (api.census.gov/data/2020/dec/pl, X-DataWebAPI-KeyError: 1), so the block-group counts cannot be pulled by a fetch script here without a key. The other route is the state P.L. 94-171 redistricting data files, one zip per state (census.gov, www2.census.gov/programs-surveys/decennial/2020/data/01-Redistricting_File--PL_94-171/), which are large; stream them as the LODES script does and keep only the block-group rows. Needs: either a Census API key in the environment, or a streaming reader for the state zips (tab-delimited, geographic header file joined to the segment files).

Built Oct 20 (claude/peaceful-ritchie-03780x) by the second route: src/core2/tooling/build-neighborhood-packs.ts streams each state's P.L. 94-171 zip (geographic header for summary level 150, segments 1 and 2 for tables P2 and P4; column layout read from Wyoming's files and checked against its published totals), reduces it to block groups and deletes the zip. 52 packs (50 states, D.C., Puerto Rico) in src/core2/data/neighborhoods/, 242,335 block groups (the Census's own count) and 334.7 million people, 21 MB. Each unit: population and voting-age population by Hispanic origin and, among those not Hispanic, by race (White, Black, American Indian and Alaska Native, Asian, other). src/core2/neighborhoods.ts loads a state's pack on demand and `minorityVapShare` sums units; src/core2/neighborhoods.test.ts shows the totals within 2 percent of each state's apportionment population (the gap is federal staff overseas), each unit's parts adding to its whole, and no race, ethnicity or language on Person, Husk or related interfaces. Not built: the ACS citizen voting-age population and the Section 203 language determinations by county, and the "unread units are estimated" rule (none are unread at this level). Both are small follow-ups; the language determinations and CVAP need their own fetch.
