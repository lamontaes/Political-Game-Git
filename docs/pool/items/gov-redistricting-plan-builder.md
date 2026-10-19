---
id: gov-redistricting-plan-builder
title: "One plan builder draws council wards, state legislative and House maps from block-group units"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-redistricting-neighborhood-data,gov-redistricting-census-count
source: added with npm run pool -- add
---

**What.** Generalize drawWardCuts into one plan builder over block-group units that makes a short list of real plans from distinct goals: even and compact; protect sitting members; most seats for the drawer's party from recorded results; and one that meets the Voting Rights Act test. Deviation limits are data rows (House near zero; state and local from the court record). A town's units are its block groups in geographic order, replacing the household-order streets.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** In a drawn place, a plan list for a town's wards and for a state's map is built with each plan's per-district people, deviation and paired incumbents by record id; src/core2/redistricting-plans.test.ts.

**Files.** src/simulation/living-world/town-wards.ts, src/core2/ (new districting engine), src/districts/

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.
