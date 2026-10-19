---
id: world-jobs-counted-retiree-income
title: "A counted retiree draws a benefit from their own earnings record"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A counted worker who retires today draws the place's average opening retirees' income, not a benefit from their own earnings and claim age. Replace it with the core's Social Security claim for counted retirees, with the benefit rules of the law in force, so a retiree's check follows their own working life. The player sees the same neighbor's pension change when the benefit law changes.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-counted-retiree-income is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-counted-retiree-income resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-counted-retiree-income.
