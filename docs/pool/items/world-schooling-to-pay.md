---
id: world-schooling-to-pay
title: A person's schooling sets the pay they are hired at
area: world
kind: wiring
priority: 3
size: M
status: claimed
source: effect-web-poverty; stopgap SG-WEB-poverty-graduation-no-engine
claimed-by: claude/schooling-to-pay
claimed-at: 2026-10-25T09:04:28.139Z
pr: #5822
---

**What.** The jobs engine prices a hire from the occupation and the market, not from the person's schooling. Read each seeker's own schooling record when a wage is set, using the researched pay premium by level, so a place whose graduation rises hires better-paid adults a decade later. The poverty measure reads those incomes with no web link.

**Rules.** An effect is a read: the wage setter must read the schooling record when it prices a hire. One model, two tiers: counted seekers use the same premium times their count. Estimate, never unknown: a premium without a source is an estimate with its spread.

**Done when.** In a one-year run of the played world in a drawn place, two seekers for one job who differ in schooling are hired at different pay, named by job record id, and a graduation change shows in later household incomes; a test proves it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/.

**Notes.** From the poverty family of the effect web. The link graduation-to-poverty no longer runs on the ledger.

Sent back 2026-10-23 from PR #5822 (branch claude/schooling-to-pay): Graduation-to-income proof is explicitly missing, same-job test falls back to different jobs, and the unmeasured within-role pay share lacks its stopgap registration/code marker; finish on that branch, merge main into it first.

Sent back 2026-10-24 UTC from PR #5822 (branch claude/schooling-to-pay): hirePay schooling discount bypasses legal minimum/public-pay floors enforced on posted positions; actual function maps floor725 to656 and1500 to1357 for no-college; preserve floors in offers/full/counted hires with regression; finish on that branch, merge main into it first.
