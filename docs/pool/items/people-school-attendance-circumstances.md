---
id: people-school-attendance-circumstances
title: "School attendance reads the child's illness and household, then the trait at its size"
area: people
kind: wiring
priority: 3
size: M
status: claimed
claimed-by: claude/school-attendance
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T14:41:35.122Z
---

**What.** Children attend 99.95% of school days and the choice reads no illness or household circumstance; add them and calibrate the trait term.

**Rules.** No dice: a child's day at home follows their own reasons (illness, household, temperament), never a rate applied to them; real attendance checks the total only. One model, two tiers. Every number in the parameter table with its tag and spread.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a child with a care need is more likely to stay home, shown by the school choice's recorded reason `own-illness` carrying their care need, in src/core2/school.test.ts; the weight is in the parameter table with its target (NCES average daily attendance) and the measured result. The calibration to 90 to 93.5 percent needs minor illness, filed as people-school-minor-illness.

**Files.** src/core2/modules/school.ts, src/core2/school.test.ts, src/core2/data/parameters.json

**Notes.** Oct 21 (claude): the child's illness is now a reason on staying home (provider school.own-illness, weight schoolAbsenceIllnessWeight 4). Measured: attendance saturates (Harvey, Iowa 94.1 percent at weights 4 and 7; most towns about 99 percent) because children have no minor illness; filed people-school-minor-illness. Household circumstances (a sick sibling, a parent's work) are the other half and are not built.
