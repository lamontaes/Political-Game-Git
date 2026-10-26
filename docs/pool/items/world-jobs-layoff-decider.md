---
id: world-jobs-layoff-decider
title: "A layoff is decided by the owner or manager person"
area: world
kind: stopgap
priority: 2
size: M
status: done
claimed-by: claude/jobs-layoff-decider
pr: #5213
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:27:23.646Z
---

**What.** Layoff decisions must name a recorded owner or manager where one exists. Use the business's recorded owner, or its best-paid remaining full worker when no owner is recorded, rather than attributing that person's decision to the business itself. The laid-off worker can then know who made the decision and ask why.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-layoff-decider is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-layoff-decider resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-layoff-decider.
