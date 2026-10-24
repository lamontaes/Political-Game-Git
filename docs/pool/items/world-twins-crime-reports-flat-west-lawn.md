---
id: world-twins-crime-reports-flat-west-lawn
title: "Effect-web twins test sees no crime-report movement in a drawn town"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The outcome-web twins test fails on clean main with EFFECT_TWINS_SEED=27ed11060d06e388, which draws West Lawn, Pennsylvania: shifting each running cause moves no engine record for crime.reported-per-capita ('expected 0 to be greater than 0'). The laws lead found it in its gate on Oct 24 and confirmed it on main with the same seed. Either no cause that runs there reaches the crime-report measure in the test's four months, or the measure's engine misses a read of the shifted cause.

**Rules.** One rule, all 56 places: the fix must hold in any drawn place and never name a state or place in logic; an effect is a read, not a record: the crime-report measure moves only where an engine reads the shifted cause, named by record id.

**Done when.** src/core2/outcome-web-twins.test.ts passes with EFFECT_TWINS_SEED=27ed11060d06e388 and two fresh random seeds, each named in the PR body; the PR names the cause that reaches crime reports in West Lawn by record id, or shows no running cause there reaches it and the test reads that from the town's own records.

**Files.** src/core2/outcome-web-twins.test.ts

**Notes.** TODO
