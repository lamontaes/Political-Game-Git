---
id: people-counted-newborn-inherits-temperament
title: "A counted baby inherits its temperament from its counted parents by the full person's family rule"
area: people
kind: stopgap
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/births-counted.ts gives a counted baby a temperament drawn from the world's seed for its age and place, ignoring its parents. A full person's child inherits through the family model. Make the counted birth read the counted parents' packed traits through the same family model, so the baby is a consistent member of its family when filled in. Closes SG-PW8-counted-newborn-temperament.

**Rules.** One model, two tiers: a counted birth uses the full person's inheritance rule on the counted parents' packed traits. No dice: the seed generates who exists, the parents' traits shape the child.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named), a counted birth's baby record carries traits computed from its parents' packed traits by record id, and src/core2/births-counted.test.ts shows two counted babies of different parents getting different inherited centers.

**Files.** src/core2/births-counted.ts, src/core2/births-counted.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): made from the open stopgap row SG-PW8-counted-newborn-temperament.
