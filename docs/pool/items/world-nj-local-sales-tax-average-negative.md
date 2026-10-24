---
id: world-nj-local-sales-tax-average-negative
title: "New Jersey's average local sales tax starts below zero, so its row reaches no seller"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The starting law row for New Jersey's local-sales-tax-average in src/core2/data/starting-law.json is -0.02, tagged ESTIMATED with a spread of 0 to 3.313, from the Tax Foundation's state and local sales tax table. Its own data note says the table shows the average as negative because Salem County charges half the state rate in place of it. The price engine collects only under positive rates, so the row reaches no seller in any New Jersey town and the prices family test had to treat a rate at or below zero as reaching nobody. The prices helper found it on Oct 24 while fixing laws-prices-local-sales-tax-average-no-seller.

**Rules.** One rule, all 56 places: the fix lives in data, never in logic that names New Jersey. Estimate, never UNKNOWN: the starting value keeps its source and spread. Research before building: model Salem County's lower rate from its own source, or start the average at zero and say why.

**Done when.** The New Jersey local-sales-tax-average starting row holds a value at or above zero with its source and spread, or Salem County's reduced rate is modeled as its own county row from a cited source, and the prices family test passes in a drawn New Jersey town with the row reaching a named seller or none by its rate.

**Files.** src/core2/data/starting-law.json, src/core2/law-wiring-prices.test.ts

**Notes.** Found by the laws lead's prices helper on Oct 24 (branch claude/laws-nine-links-prices).
