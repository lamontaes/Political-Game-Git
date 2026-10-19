---
id: world-union-dues-from-own-cash
title: "Union dues leave each member's own cash through the ledger"
area: world
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-union-membership-record,world-union-join-leave-choice
source: "split from core-stopgap-membership-dues-assumed-data (SG-WORLD-business-union-members), Oct 19"
---

**What.** Replace the pooled dues flow with a monthly dues payment from each member's own account to the local, through the ledger, closing SG-WORLD-business-union-members once the record and the join choice exist.

**Rules.** Wire to the world: dues and membership move real money and real people. One model, two tiers: counted workers join at their group's rate and a filled-in person matches it. No dice: nobody joins by a roll; pay, job and views decide. Numbers in the parameter table, tagged.

**Done when.** In a one-year played world (buildBenchWorld, drawn place) each member's journal shows a dues line to the local and the stopgap row is resolved in src/core2/data/stopgaps.json; the tripwire test passes.

**Files.** src/core2/membership-dues.ts, src/core2/data/stopgaps.json

**Notes.** Parent: core-stopgap-membership-dues-assumed-data. Today src/core2/membership-dues.ts takes members as the place's employed times the state's BLS rate and draws dues from pooled cash.
