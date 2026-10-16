---
id: core-counted-retiree-income-from-law
title: "A counted retiree is paid the Social Security the law in force gives"
area: core
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `addCountedRetiree` pays the place's opening-retiree average and nothing reads the federal law in force, so a benefit cut or raise never reaches counted retirees (SG-WORLD-jobs-counted-retiree-income). Compute the amount from the law in force.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, a Social Security level change moves a counted retiree's payment, by flow and law row ids.

**Files.** src/core2/residents-economy.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.
