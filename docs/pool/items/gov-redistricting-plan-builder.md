---
id: gov-redistricting-plan-builder
title: "One plan builder draws council wards, state legislative and House maps from block-group units"
area: gov
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
after: gov-redistricting-neighborhood-data,gov-redistricting-census-count
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:26:44.650Z
---

**What.** Generalize drawWardCuts into one plan builder over block-group units that makes a short list of real plans from distinct goals: even and compact; protect sitting members; most seats for the drawer's party from recorded results; and one that meets the Voting Rights Act test. Deviation limits are data rows (House near zero; state and local from the court record). A town's units are its block groups in geographic order, replacing the household-order streets.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** In a drawn place, a plan list for a town's wards and for a state's map is built with each plan's per-district people, deviation and paired incumbents by record id; src/core2/redistricting-plans.test.ts.

**Files.** src/simulation/living-world/town-wards.ts, src/core2/ (new districting engine), src/districts/

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

First piece built Oct 20 (claude/peaceful-ritchie-03780x): src/core2/redistricting-plans.ts, the even plan (`evenPlan`: block groups in id order, which is county then tract then block group, cut where the running total passes each district's share, each unit placed by its midpoint), `planStats` and `maxDeviation`, and `districtCvapMakeup` (a district's citizen voting-age people and non-White-non-Hispanic share, summed from units). src/core2/redistricting-plans.test.ts, on real packs: New Mexico into its 3 House districts and Washington into 10, each within half a percent of equal, every unit in one district, each district a run of ids, and New Mexico's districts 30 to 80 percent minority citizen voting-age. Left: the plans for the other goals (protect sitting members, most seats for the drawer's party, meet the Voting Rights Act test), which read incumbents and recorded results; deviation limits as data rows; replacing the town wards' household-order streets with block groups (src/simulation/living-world/town-wards.ts); and a geometric compactness test, since id order is a stand-in for adjacency (no block group geometry is in the repository).

Second piece built Oct 20 (claude/peaceful-ritchie-03780x), in src/core2/redistricting-plans.ts: the deviation limits as data (src/core2/data/redistricting/deviation-limits.json: U.S. House 0.1 percent total spread from Karcher v. Daggett and Wesberry v. Sanders; state legislative and local 10 percent from Brown v. Thomson, Gaffney v. Cummings, Reynolds v. Sims, Abate v. Mundt and Avery v. Midland County; each SOURCED with a spread) with `deviationLimit`, `totalDeviation` and `meetsDeviationLimit`; and `vraPlan`, which cuts the units in id order, by dynamic programming, into districts each within the level's limit so that the most districts have a majority of citizen voting-age people who are not White-alone-non-Hispanic (the Gingles first condition measured from units), ties to the plan nearest equal. Measured: New Mexico (3 districts, 1,614 block groups) 3 majority-minority districts, same as the even plan; Texas (38 districts, 18,638 block groups) 22 against the even plan's 19, in 317 ms; Washington (10) none in either. The test is in src/core2/redistricting-plans.test.ts. The "majority-minority" count is for all groups not White alone together; the court test for a protected group is per group (Black, Hispanic, Asian, Native American), which needs the group named per case from the challenge (gov-redistricting-map-challenge). Still left: the plans that protect sitting members and favor the drawer's party (they read incumbents and recorded results), the town wards on block groups, and compactness (id order stands in for adjacency).
