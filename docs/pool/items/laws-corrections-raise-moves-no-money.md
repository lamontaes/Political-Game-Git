---
id: laws-corrections-raise-moves-no-money
title: "Raising the corrections line moves no money an engine pays"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the Oct 24 justice regrade, raising budget-line:corrections in Prescott, Michigan and Uehling, Nebraska moved no money through an engine: jail days are capped by the sentences being served, so more capacity buys nothing, and the money link graded wired only on treasury rounding (budgets-treasury.ts:851 differs by one unit against the control world). A larger corrections line should either fund something the jail spends (staff, programs, conditions) or be returned unspent at the close.

**Rules.** An effect is a read: the engine that pays reads the line when it pays. Replace, never layer. No dice.

**Done when.** In a played world (buildBenchWorld, seeds a91c03e7d2b84f10 and 5e27b0c4196fd3a8), a raised corrections line moves a journal post an engine makes because of it, named by journal id in the justice family test, and the checker's money link cites that post, not rounding.

**Files.** src/core2/public-safety.ts, src/core2/law-wiring-justice.test.ts

**Notes.** From the laws lead's justice helper, Oct 24.
