---
id: gov-official-staff-allowance-by-office
title: "An official hires an aide only where their office has a staff allowance, sized by office and place from research"
area: gov
kind: wiring
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** An official weighs hiring an aide against the government's whole pay room (src/core2/modules/staff.ts, budgetLean), which nearly every town has years of, so the budget term saturates at its cap and nearly every local official of every town hires an aide within months: 28 of 28 in Modoc, South Carolina (place key 4547050, seed 40e3475febc7) and 36 of 36 in Stockbridge, Georgia (1373704, seed bde29897f271) in a played year. Real staff allowances vary by office and place: big-city council members and state legislators have staff budgets, most small-town council members have none. With every office able to afford an aide, the hire decision's case is the same for every official, so temperament turns nobody (net odds 1.00 between the thirds in both places) or, at a larger weight, becomes a trait bar.

**Cause.** Measured: Modoc, South Carolina (place key 4547050, seed 40e3475febc7) shows 28 of 28 officials hiring an aide in a played year, and Stockbridge, Georgia (1373704, seed bde29897f271) 36 of 36; the cause is in src/core2/modules/staff.ts function budgetLean (line 801), which takes years of room against the full staff wage.

**Fix.** Add a staff allowance by office type and place size in data (sourced or estimated from NCSL, ICMA and NLC surveys) and let the allowance's room, not the whole pay room, slide the hire case. Each hire's record names the allowance it read.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: allowances come from data by office type and place size, never a named place. Research before building: sourced or estimated allowances (for example NCSL legislative staff counts, ICMA or NLC surveys of council staff). Sliding scales: the allowance's room slides the case, no cutoff. Estimate, never UNKNOWN.

**Done when.** A second session, in one year of buildBenchWorld in two places drawn from all 56 (seeds named), finds the share of local officials who hire an aide differing by office and place size in the direction the research shows, each hire's record naming the allowance it read, and scripts/traits/trait-wiring-matrix.ts showing staff.hire turned by temperament in both places (net odds between the thirds above 1.0, reported with the number).

**Waits on.** Nothing.

**Files.** src/core2/modules/staff.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-integrity-cases-vary: the other three case decisions reach their research sizes once each played case is crossed with every decider's lean; hiring cannot while its case is the saturated budget alone.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have researched staff allowances by office and place so fewer officials hire an aide; the aide is a payroll line no screen the player uses shows.
