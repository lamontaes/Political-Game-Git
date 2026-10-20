---
id: world-schooling-to-pay
title: A person's schooling sets the pay they are hired at
area: world
kind: wiring
priority: 3
size: M
status: open
source: effect-web-poverty; stopgap SG-WEB-poverty-graduation-no-engine
---

**What.** The jobs engine prices a hire from the occupation and the market, not from the person's schooling. Read each seeker's own schooling record when a wage is set, using the researched pay premium by level, so a place whose graduation rises hires better-paid adults a decade later. The poverty measure reads those incomes with no web link.

**Rules.** An effect is a read: the wage setter must read the schooling record when it prices a hire. One model, two tiers: counted seekers use the same premium times their count. Estimate, never unknown: a premium without a source is an estimate with its spread.

**Done when.** In a one-year run of the played world in a drawn place, two seekers for one job who differ in schooling are hired at different pay, named by job record id, and a graduation change shows in later household incomes; a test proves it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/.

**Notes.** From the poverty family of the effect web. The link graduation-to-poverty no longer runs on the ledger.
