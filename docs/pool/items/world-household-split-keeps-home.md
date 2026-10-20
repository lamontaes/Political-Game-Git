---
id: world-household-split-keeps-home
title: "When part of a mortgaged household leaves, a recorded decision says who keeps the home and the loan"
area: world
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/modules/moves.ts never lets a mortgaged household split except for a grown child moving out; a household that leaves sells its home. Add a recorded decision of who keeps the home and its mortgage when some members leave (who holds the title and loan, who can afford the payment), so groups can leave with part of the household behind. Closes SG-P15-moves-owners-stay. The owner's Oct 20 ruling keeps the player's own family from leaving the player before 1.0.

**Rules.** No dice: who keeps the home reads title, income and the payment. One model, two tiers: counted households split by the same rule. Wire to the world: the mortgage's payer changes on the credit engine.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), a mortgaged household splits with the stayers keeping the loan, the mortgage payer change and the leavers' move named by record id, checked in src/core2/modules/moves.test.ts; the player's household never splits.

**Files.** src/core2/modules/moves.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-P15-moves-owners-stay stays open while its pool item is done.
