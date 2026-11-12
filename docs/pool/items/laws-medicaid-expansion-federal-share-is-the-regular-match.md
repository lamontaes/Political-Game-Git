---
id: laws-medicaid-expansion-federal-share-is-the-regular-match
title: "The Medicaid expansion's federal share uses the state's regular match, not the expansion match"
area: laws
kind: research
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-laws-medicaid-expansion-federal-share-is-the-regular-match
pr: #8529
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:30:24.123Z
---

**What.** When the Medicaid expansion pays coverage, the federal government's share is taken at the state's regular match: 65.13 percent in Prescott, Michigan (seed a91c03e7d2b84f10) and 57.52 percent in Uehling, Nebraska (seed 5e27b0c4196fd3a8), measured in the health-schools year runs (found by the health-schools helper, Oct 25). Federal law pays a higher share for the expansion population: 90 percent from 2020 on (42 U.S.C. 1396d(y)(1), from the lead's memory; confirm against the statute's text). With the regular match, every expansion state's treasury pays several times what it should, which feeds its budget, its taxes and the outcome web. Seen: the state's Medicaid cost on its budget (federal share is 65% where the law pays 90%).

**Cause.** Found in code: `payMedicaidCare` in src/core2/law-reach/group-b-money.ts (line 838) reads `lawInForce(api, "medicaid-match")` (line 856), the regular match (for example 51.37 in src/core2/data/laws/starting-law.json), for the expansion's federal leg.

**Fix.** Add a sourced expansion match (42 U.S.C. 1396d(y)) to the law data, quoted from a fetched page, and have the expansion's federal leg read it; state the treatment of the territories' capped financing.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN, and research before building: the share is a sourced parameter quoted from the statute, the same rule in all 56 places, with territories handled by their own capped financing. Use the researcher skill.

**Done when.** A second session, not the builder, runs a year of the health-schools family in a played world (`buildBenchWorld`) at the drawn place Prescott, Michigan (seed a91c03e7d2b84f10) and sees the expansion's federal share at the statute's rate by journal id, the statute quoted from a fetched page in a parameter table as SOURCED, and the territories' treatment stated. Nothing on screen reads it yet beyond Politics → Budgets.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/data/laws/starting-law.json, src/core2/data/laws/reach-group-b-parameters.json

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report. Use the researcher skill.
