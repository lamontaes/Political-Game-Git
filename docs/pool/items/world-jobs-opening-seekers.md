---
id: world-jobs-opening-seekers
title: "The opening's job seekers follow the labor-force counts, not the neediest jobless adults"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-3xfqef-2
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:26:33.128Z
---

**What.** The opening names as job seekers the jobless working-age adults whose money covers the fewest days, as many as the national unemployment rate implies, and leaves the other jobless adults outside the labor force. Replace this with the place's own labor-force counts by age and job (CPS and LAUS) read at the opening, with full people filled in from the counted groups, so seekers are a group read with the same rule as any person. The player sees a town whose unemployed look like the real ones, not only the poorest.

**Rules.** One model, two tiers: counted people and full people are read by the same rule, times their count. No dice: hires, layoffs and retirements come from books, fit, need and the law in force, never a monthly chance. Replace, never layer: the fake is deleted in the same change and the row SG-WORLD-jobs-opening-seekers is cleared in src/core2/data/stopgaps.json, never closed by deleting it alone.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body) the mechanic above appears by job, decision or claim record id, a test in src/core2/jobs.test.ts shows it, the stopgap tripwire test shows SG-WORLD-jobs-opening-seekers resolved, and the PR body names one affected person by record id.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic (an L item) on Oct 19; row SG-WORLD-jobs-opening-seekers.
