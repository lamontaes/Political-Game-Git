---
id: metrics-state-revenue-growth-against-a-published-figure
title: "Check the played state's yearly revenue growth against a published figure and against the other states"
area: gov
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: budgets-revenue-rebudgeted-yearly
blocked-on:
lead: laws
model: opus
effort: medium
root: none
source: Account lead, Nov 15, after budgets-revenue-rebudgeted-yearly
---

**What.** After budgets re-budget revenue yearly, the played state's budgeted revenue follows its own collections while the other 55 states follow the country tier. At Washington, Kansas (599e6f66e9c1d25a) the played state grew +1.8% then +3.0% a year while the other states' median was +1.2%, about 1.8 points slower. Nothing in the repo is a published state revenue growth figure to check either against (the one growth row, NASBO spring 2026, is spending, +0.6%). A check against a sourced figure tells which of the two paths is off. Seen: Budgets' state revenue next to last year's.

**Cause.** Found in code: `collectionsOverBase` (src/core2/modules/budgets.ts) scales the played state's revenue by its treasury's own collections, while `writeBudget` (src/core2/modules/outside-budgets.ts) reads each other state's lines from the country tier's ledger; two sources, no published figure to settle which is closer.

**Fix.** Research the Census and state revenue series for fiscal 2022 to 2025 growth (SOURCED), record the growth and its spread as an ESTIMATED row in the parameter table, and measure both paths against it in two drawn places for three fiscal years. Correct the path that sits outside the spread in its own engine; change neither toward the figure without the measurement.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sources only establish relationships and effects; chosen numbers are ESTIMATED rows with a spread (owner, Nov 14). Real data checks the simulation and never decides an outcome. One engine per mechanic (owner, Oct 27).

**Done when.** A second session plays three fiscal years in a drawn place, naming the place and seed, and the played state's yearly revenue growth and the other states' median both sit within the published figure's spread, or the gap is named by record.

**Waits on.** budgets-revenue-rebudgeted-yearly.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/outside-budgets.ts, src/core2/data/parameters.json
