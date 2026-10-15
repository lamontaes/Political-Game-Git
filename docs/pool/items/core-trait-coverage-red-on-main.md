---
id: core-trait-coverage-red-on-main
title: "trait-coverage.test.ts fails on main: office-day files weigh traits but are not in the decision table, and the generated town carries no level on some traits"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three tests in `src/core2/trait-coverage.test.ts` fail on clean main (checked Oct 15): "finds every decision in code that weighs traits" names `src/core2/office-day-acts.ts` and `src/core2/modules/office-day.ts`, which decide with traits but are not in the decision table (`data/content/trait-decisions.json`, or its `outside` list with a reason); and the two generated-town tests ("carries a level on every trait for every adult" and "changes what people choose at each end of every trait") fail in a drawn place. Add the office-day decisions to the table, then find why the generated adults lack a level on some traits.

**Rules.** Every trait is wired into every decision at both ends (owner, Oct 6 and Oct 12); one rule, all 56 places; no dice.

**Done when.** `src/core2/trait-coverage.test.ts` passes in a random place and seed on main.

**Files.** data/content/trait-decisions.json, data/content/trait-coverage.json (regenerate with `node --import tsx scripts/traits/trait-coverage.ts`), src/core2/modules/office-day.ts, src/core2/office-day-acts.ts

**Notes.** Found by core-trusts-background, which adds the `estates.trust` decision and regenerates the coverage table; it did not cause these.
