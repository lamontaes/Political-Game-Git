---
id: core-counted-death-relations
title: "Full people's counted relatives start with recorded closeness, so a counted death reaches them"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A counted relative can receive a death notice, but the core opening skips relationship initialization when the other person is a counted person (a husk), so full-to-counted family ties carry no closeness and grief never follows. Initialize those family relationship records through the shared core rule at the opening, reconcile the bench's own family closure with the core opening, and prove a counted death reaching a full relative who grieves. Closes SG-CORE-counted-death-relations.

**Rules.** One model, two tiers: a counted relative's tie is recorded by the same closeness rule as a full one. Ask why: the grief cites the death record and the relationship record by id. No dice: closeness comes from the family model's recorded inputs.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, redrawn until a counted relative of a full person dies, both named in the PR body), the death record, the notice to the full relative and their grief or view change are named by record id, and src/core2/births-counted.test.ts fails if the opening leaves a full-to-counted family tie without closeness.

**Files.** src/core2/births-counted.ts, src/bench/world.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-CORE-counted-death-relations.
