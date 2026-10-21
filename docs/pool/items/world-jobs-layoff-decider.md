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

**What.** A layoff today names the business itself as the one who decided it whenever no owner is recorded. Replace that fallback with the owner or manager person the firm actually has (the M1-08 record, or the highest-paid worker where none is recorded), deciding from their own traits and the books. The laid-off worker can then say who let them go, and the decider's view of the firm can be asked why.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-layoff-decider is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-layoff-decider resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-layoff-decider.
