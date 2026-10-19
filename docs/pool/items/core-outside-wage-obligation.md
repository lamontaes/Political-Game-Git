---
id: core-outside-wage-obligation
title: "A private employer outside the town can pay a worker's wages from the place's outside account, against an exact due record"
area: core
kind: feature
priority: 2
size: L
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:11:05.471Z
---

**What.** A private employer outside the town has no cash on the books, so a commuting worker's wages are asked of nobody. Let the place's outside account pay such wages against an exact due record, the way a town employer pays from its own cash. Each payment names the worker, the employer, the period and the amount.

**Rules.** Wire to the world: the outside account's cash pays the wage and the worker's account receives the same dollar. One model, two tiers: counted workers and full workers are paid by the same rule, times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, a commuting worker's wage is paid from the outside account against a due record, shown by due record id and journal record id, and every dollar balances; a test in src/core2 states it.

**Files.** src/core2/modules/work.ts, src/core2/modules/residents.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
