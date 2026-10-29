---
id: gov-prior-year-budgets-at-opening
title: "M1-14: every government opens with one budget on record; no prior years' budgets show"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/prior-year-budgets
pr: #6231
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T05:35:49.658Z
---

**What.** The new M1-14 check (src/bench/m1-14-check.ts) in Dayton, Indiana (place key 1817002, seed 2a04cfa145d92fed4953136fc2e3f97c9287c907b8bb574d2d9683273cccb399) read the pre-start history of a new game. Each government shows exactly one adopted budget before the start: the United States and Indiana fiscal 2024, Tippecanoe County and the Town of Dayton fiscal 2025. The budgets module's pre-start pass (budgetHistory in src/core2/modules/budgets.ts) enters only the budget the opening carries, so the spec's 'governments show prior years' budgets' has nothing to show.

**Rules.** Estimate, never UNKNOWN: a prior year's budget comes from the real published figure where the repo has it, or an estimate from it with its source and spread. Wire to the world: the prior budgets are history records the budget screens and news can read.

**Done when.** The M1-14 command in Dayton, Indiana (seed above) and a second place drawn from all 56 shows at least two fiscal years of adopted budgets for every government before the start, each with its source by record id in the PR body. **On screen.** Nothing yet: filed play-prior-budgets-on-screen, which puts it on Politics → Budgets.

**Files.** src/core2/modules/budgets.ts

**Notes.** Found by the M0-M2 lead writing M1-14's command, Oct 24. Blocks roadmap M1-14.
