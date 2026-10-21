---
id: core-counted-retiree-income-from-law
title: "A counted retiree is paid the Social Security the law in force gives"
area: core
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4657
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `addCountedRetiree` pays the place's opening-retiree average and nothing reads the federal law in force, so a benefit cut or raise never reaches counted retirees (SG-WORLD-jobs-counted-retiree-income). Compute the amount from the law in force. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, a Social Security level change moves a counted retiree's payment, by flow and law row ids. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/core2/residents-economy.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4657 (branch claude/core-counted-retiree-law): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
