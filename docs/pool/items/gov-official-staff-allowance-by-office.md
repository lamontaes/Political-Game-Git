---
id: gov-official-staff-allowance-by-office
title: "An official hires an aide only where their office has a staff allowance, sized by office and place from research"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** An official weighs hiring an aide against the government's whole pay room (src/core2/modules/staff.ts, budgetLean), which nearly every town has years of, so the budget term saturates at its cap and nearly every local official of every town hires an aide within months: 28 of 28 in Modoc, South Carolina (place key 4547050, seed 40e3475febc7) and 36 of 36 in Stockbridge, Georgia (1373704, seed bde29897f271) in a played year. Real staff allowances vary by office and place: big-city council members and state legislators have staff budgets, most small-town council members have none. With every office able to afford an aide, the hire decision's case is the same for every official, so temperament turns nobody (net odds 1.00 between the thirds in both places) or, at a larger weight, becomes a trait bar.

**Rules.** One rule, all 56 places: allowances come from data by office type and place size, never a named place. Research before building: sourced or estimated allowances (for example NCSL legislative staff counts, ICMA or NLC surveys of council staff). Sliding scales: the allowance's room slides the case, no cutoff. Estimate, never UNKNOWN.

**Done when.** In one year of buildBenchWorld in two places drawn from all 56, seeds named, the share of local officials who hire an aide differs by office and place size as the research shows, each hire's record names the allowance it read, and scripts/traits/trait-wiring-matrix.ts shows staff.hire with net odds between the thirds from 1.2 to 3 in both places.

**Files.** src/core2/modules/staff.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-integrity-cases-vary: the other three case decisions reach their research sizes once each played case is crossed with every decider's lean; hiring cannot while its case is the saturated budget alone.

Deferred Oct 25: nothing on screen reads it yet.
