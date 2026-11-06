---
id: law-levels-income-tax-grant
title: "Law levels: a town's income tax ends when its state withdraws the power"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: law-levels-income-tax-grant
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T02:22:50.058Z
---

**What.** Income tax is added level by level and the state's grant of local authority was only read when a bill was drafted, so a withdrawal left towns' taxes in force (docs/reports/law-levels-2026-11-05.md, Part B).

**Rules.** Higher level wins; a state row at 0 in force on the date sets the town's row aside; no dice.

**Done when.** resolveLawInForce sets aside a town's income tax while the state's local-income-tax-authority row in force says 0; a test on a drawn place shows 5 with the grant and 4 after it is withdrawn.

**Files.** src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/local-income-tax-grant.test.ts

**Notes.** TODO
