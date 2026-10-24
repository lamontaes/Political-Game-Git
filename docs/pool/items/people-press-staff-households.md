---
id: people-press-staff-households
title: "A press person who lives outside town gets a real household with rent, living costs and kin"
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

**What.** src/core2/press-staff.ts seats an out-of-town press person alone, with no rent, living costs or family, because the identity fill-in makes a person without a home. Draw their household as the opening draws any household of their age and pay, with rent, living costs and kin. Closes SG-PEOPLE-press-staff-households.

**Rules.** One model, two tiers: the press person's household follows the same household draw as any other. Estimate, never UNKNOWN: their costs start from the real average for their pay.

**Done when.** In a one-year run of the played world (buildBenchWorld, drawn place and seed named), an out-of-town station news director's household record holds a rent and living-cost flow by id, checked in src/core2/press-staff.test.ts.

**Files.** src/core2/press-staff.ts, src/core2/press-staff.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-PEOPLE-press-staff-households stays open while its pool items are done.
