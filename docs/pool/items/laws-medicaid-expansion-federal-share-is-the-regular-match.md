---
id: laws-medicaid-expansion-federal-share-is-the-regular-match
title: "The Medicaid expansion's federal share uses the state's regular match, not the expansion match"
area: laws
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When the Medicaid expansion pays coverage, the federal government's share is taken at the state's regular match: 65.13 percent in Prescott, Michigan (seed a91c03e7d2b84f10) and 57.52 percent in Uehling, Nebraska (seed 5e27b0c4196fd3a8), measured in the health-schools year runs (found by the health-schools helper, Oct 25). Federal law pays a higher share for the expansion population: 90 percent from 2020 on (42 U.S.C. 1396d(y)(1), from the lead's memory; confirm against the statute's text). With the regular match, every expansion state's treasury pays several times what it should, which feeds its budget, its taxes and the outcome web.

**Rules.** Estimate, never unknown, and research before building: the share is a sourced parameter quoted from the statute, the same rule in all 56 places, with territories handled by their own capped financing.

**Done when.** The statute's expansion match is quoted from a fetched page into a parameter table as SOURCED, the expansion's federal share reads it in `buildBenchWorld` worlds, and a year run of the health-schools family in Prescott, Michigan (seed a91c03e7d2b84f10) shows the expansion's federal share at that rate by journal id, with the territories' treatment stated.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/data/laws/

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report. Use the researcher skill.
