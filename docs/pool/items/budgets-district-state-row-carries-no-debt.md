---
id: budgets-district-state-row-carries-no-debt
title: "The District's state-level budget row is all zeros, so what the nation's borrowing costs it never reprices its debt service"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
source: World B, #10116, seed 4ff201fe66a53f7c90efcf1fcc962b57c4ea322b; CTO line on #9747 (comment 6980511354, Nov 18, 13:49Z)
---

**What.** The real District pays debt service every year. In the played District the interest never answers a dearer cost to borrow: a larger federal deficit moves what every state pays its bondholders and moves nothing at the District. Seen: the dev Budgets screen for the District, its state-level government showing every line at zero.

**Cause.** Found in code: the published bases (`data/research/money/public-budget-bases.json`, place `US-DC`, `governments.state`) carry every spending line at 0.0, including `interest`, while the town's own row carries `interest` at 966.49 a resident (`governments.city` and `county-whole`). The treasury reprices interest only where `gov.level === "state"` (`interestFactor`, src/core2/budgets-treasury.ts, the month's close), so the District's debt service, kept on the city row, is not repriced. `federal-deficit-borrowing-cost.test.ts` showed it as 0 owed against 0 owed (#10116 passes over such a draw by its condition, the budget plans no interest line).

**Fix.** Where the state-level row plans no interest, the debt service sits in the town's lowest government, and the repricing reads that government's interest line too (one rule, by the row's own condition, no place named). Then drop the pass-over from `federal-deficit-borrowing-cost.test.ts`, so the District's draw is checked, not passed over. Whether the state-level row should hold the District's lines instead is Budgets' and History's call; either way the repriced line is the one that holds the debt.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic (owner, Oct 27): the existing repricing, not a second one. One rule, all 56 places: by the row's own condition, never a name. Everything comes from the simulation (owner, Nov 16): no figure is typed; the debt is the row's.

**Done when.** `npx vitest run src/core2/federal-deficit-borrowing-cost.test.ts` passes with `DEFICIT_SEED=4ff201fe66a53f7c90efcf1fcc962b57c4ea322b` and no pass-over for the District: its interest owed is larger than the control's by the web's added basis points over the rate. A second session, in a drawn place and a seed nobody chose, raises the federal defense line in dev mode and sees the state's interest line (at the District, the town's) owe more.

**Waits on.** #10116 (the pass-over it removes).

**Files.** src/core2/budgets-treasury.ts, src/core2/federal-deficit-borrowing-cost.test.ts, data/research/money/public-budget-bases.json

**Notes.** Proved at Washington, District of Columbia (1150000, seed 43f2ec20f3d8131e1ddf5727ce0623d9b932b9dc6df1dd0d0cb6b61106d98fd3) with a trial fix: +14.5 basis points, interest owed 6,496,604,581 against 6,310,525,724 in the control. The trial was not kept; the CTO approved #10116 as a pass-over first.
