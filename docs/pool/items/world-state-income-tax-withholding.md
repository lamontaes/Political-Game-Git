---
id: world-state-income-tax-withholding
title: "No starting state income-tax row produces a withholding line: only federal tax comes out of a paycheck"
area: world
kind: bug
priority: 2
size: M
status: dropped
claimed-by: claude/world-state-income-tax-withholding
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:02:24.376Z
---

**What.** In every place tried (a state's first locality in each of 55 states), the income-tax answer for a resident at the starting law rows gives the federal level a rate and schedule, but the state level resolves to a row with a unit such as percent-of-wages 2.7 and no schedule, so `withholdingFor` (src/core2/tax-withholding.ts) returns no state line and only federal income tax, Social Security and Medicare come out of a paycheck. The scan of starting rows does show state rows with a top rate and a schedule (Alabama 5 percent), so the resolver is probably choosing the wrong row for the series, or the series mixes a payroll levy into income-tax. Find which, and make each state's resident pay that state's income tax from their paycheck by the law in force.

**Rules.** An effect is a read: the law row in force sets the tax. One rule, all 56 places: states without an income tax produce no line, and no state is named in code. Every dollar balances: the treasury line receives exactly what the paycheck loses. Ask why: the state line names its law row id.

**Done when.** In a one-year played world in a drawn place from all 56 with a state income tax (name and seed in the PR body), a named worker's paycheck record has a state income line naming its law row id, the state treasury line rose by it, and the income-tax-played test checks it.

**Files.** src/core2/tax-withholding.ts, src/core2/modules/budgets.ts, src/core2/laws-starting.ts, src/core2/laws-in-force.ts

**Notes.** Found while building world-withholding-outside-governments (Oct 16): with the state level resolving to no schedule, no outside state was ever taxed in the fixture until a flat row was enacted by hand.

Not a defect (claude, Oct 16; the CTO may drop it). I wrongly read the fixture. For the town's own residents state income tax is withheld: in Mohall-style run (Alabama place 0100100, seed wh1, 25 workers over 450 days) the state line totals $34,553.65 in 2025 and $10,777.93 by mid-April 2026, next to the federal income line. The starting law rows begin 2026-01-01, so a resident of a place outside the town has no state row before then; that gap is only reachable by commuters (world-commuters-in-opening) and the outside-government fixture. The PR text for world-withholding-outside-governments (#4752) has the same claim and is corrected there.
