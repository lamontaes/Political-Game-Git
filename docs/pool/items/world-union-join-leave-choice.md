---
id: world-union-join-leave-choice
title: "A worker joins or leaves a union from pay, job and views"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-union-membership-record
source: "split from core-stopgap-membership-dues-assumed-data (SG-WORLD-business-union-members), Oct 19"
---

**What.** Full people and counted groups choose to join or leave their local through the shared chooser, weighing dues against pay, the job's coverage and their views of unions. Dues are paid from the member's own cash, not pooled cash.

**Rules.** Wire to the world: dues and membership move real money and real people. One model, two tiers: counted workers join at their group's rate and a filled-in person matches it. No dice: nobody joins by a roll; pay, job and views decide. Numbers in the parameter table, tagged.

**Done when.** In a one-year played world in a drawn place (name and seed in the PR body) a named worker's join or leave shows the dues, pay and view record ids that decided it, and the local's income equals its members' dues, in src/core2/membership-dues.test.ts.

**Files.** src/core2/membership-dues.ts, src/core2/modules/work.ts

**Notes.** Parent: core-stopgap-membership-dues-assumed-data. Today src/core2/membership-dues.ts takes members as the place's employed times the state's BLS rate and draws dues from pooled cash.
