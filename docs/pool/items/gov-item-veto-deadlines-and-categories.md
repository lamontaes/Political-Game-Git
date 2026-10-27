---
id: gov-item-veto-deadlines-and-categories
title: "The item veto finishes its special deadlines, outside assent and protected spending categories"
area: gov
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The item veto in src/core2/modules/legislature.ts now strikes or reduces appropriation increases with exact override fractions and the played year proves the chain, but special deadlines, external assent and some protected or mixed appropriation categories are incomplete, and territorial reductions are unavailable. Read the remaining legal details from data per place and finish those cases. Closes SG-STATE-line-item-veto-engine.

**Rules.** One rule, all 56 places: deadlines and protected categories live in data per place. The chain is the acceptance: a struck line is followed to the adopted budget and a named owner.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn state with a special item-veto deadline and a seed named, the veto, its override vote and the adopted line are named by record id, and src/core2/modules/legislature.test.ts covers a protected category.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/budgets.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-STATE-line-item-veto-engine stays open while its pool item is done.
