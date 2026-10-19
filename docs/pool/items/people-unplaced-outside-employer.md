---
id: people-unplaced-outside-employer
title: "Commuting workers have an employer on the books: the place's outside account employs them, with pay and withholding"
area: people
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Workers who commute into the town from outside have no employer on the books, so they have no pay record or withholding. Let the place's outside account stand as their employer, with a job, pay and withholding like any other worker. Register the stand-in as a stopgap until real outside employers exist.

**Rules.** Wire to the world: pay and withholding move real dollars from the outside account to the worker and the treasury. One model, two tiers: counted and full commuters follow the same rule.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, each commuting worker has a job at the outside account with pay and withholding shown by journal record ids, every dollar balances, and a test in src/core2 states it.

**Files.** src/core2/modules/work.ts, src/core2/modules/residents.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
