---
id: core-policy-authority-limited-cell-predicates
title: "A limited power's conditions are checked before a bill or an order: county home rule from each state's record"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/policy-authority.ts allows any power cell marked limited, and records the grant as disputed, because the cell's conditions are prose, not checks. Fourteen county cells (zoning, building codes, policing, public health, water, parks and others) carry the condition home rule or Dillon's Rule, and NACo Research (2022) now gives each state's county authority level from 1 to 6, its home rule option and its Dillon's Rule flexibilities for all 56 places in data/research/core/naco-2022-county-authority.json. Turn each limited cell's condition into a structured predicate the same reader evaluates before introduction or an executive order, reading the county level from that file and the city cells' conditions (municipal utilities only, ordinance violations only, charter election rules) from the place's records. Closes SG-GOV-policy-power-conditions with laws-territory-powers-research for the territory cells.

**Rules.** One rule, all 56 places: the county level comes from the per-place file keyed by postal code, never a state named in logic. The chain is the acceptance: an allowed or refused county ordinance cites the catalog cell and the NACo row by id as its reason.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR), a county or city question on a limited cell records the predicate's result and the NACo row or place record it read as its reason, by authority record id, with no disputed grant left for a limited cell, and a test in src/core2/policy-authority.test.ts covers a level 1 and a level 6 state.

**Files.** src/core2/policy-authority.ts, src/core2/policy-authority.test.ts, data/research/core/naco-2022-county-authority.json, data/research/powers-catalog/catalog.json, src/core2/data/stopgaps.json

**Notes.** TODO
