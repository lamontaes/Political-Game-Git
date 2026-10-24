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
claimed-at: 2026-10-24T16:10:03.645Z
pr: #5822
---

**What.** The jobs engine prices a hire from the occupation and the market, not from the person's schooling. Read each seeker's own schooling record when a wage is set, using the researched pay premium by level, so a place whose graduation rises hires better-paid adults a decade later. The poverty measure reads those incomes with no web link.

**Rules.** An effect is a read: the wage setter must read the schooling record when it prices a hire. One model, two tiers: counted seekers use the same premium times their count. Estimate, never unknown: a premium without a source is an estimate with its spread.

**Done when.** In a one-year run of the played world in a drawn place, two seekers for one job who differ in schooling are hired at different pay, named by job record id, and a graduation change shows in later household incomes; a test proves it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/.

**Notes.** From the poverty family of the effect web. The link graduation-to-poverty no longer runs on the ledger.

Oct 21 (claude, claude/schooling-to-pay): built the hire half. `hirePay` (jobs.ts) moves a position's pay by the hire's own education record (`profile:education` fact, or the profile it is drawn from) using BLS Table 5.1 2025 weekly earnings by level (SOURCED) and `jobsSchoolingPayShare` 0.4 (ESTIMATED, spread 0.2 to 0.7, unmeasured: the share of the gap that holds within one role). Full hires, counted hires and the player's job offer all use it. Test: src/core2/jobs-schooling-pay.test.ts. Not done: "a graduation change shows in later household incomes" (the poverty read) and a research item for the within-role share. Owner decision flagged: town-pay.ts says credentials select actual paid peers, never a fixed degree premium; this item asks for a premium by level.

Sent back 2026-10-23 from PR #5822 (branch claude/schooling-to-pay): Graduation-to-income proof is explicitly missing, same-job test falls back to different jobs, and the unmeasured within-role pay share lacks its stopgap registration/code marker; finish on that branch, merge main into it first.
