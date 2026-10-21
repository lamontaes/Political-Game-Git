---
id: laws-reach-rows-stale-as-people-age
title: "Law reach rows chosen by age or a child in the home are written once and never end or open as people age"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A law's reach rows for a person are written when the law takes effect and stay as they were. A row chosen by age or by a child in the home (the child access prevention storage duty, concealed carry age, juvenile age) is never ended when the last child turns 18 and never opened for a household that gains a child or an adult who turns of age. Measured on the household-firearms seed 2724fc27c0417f7c: the adults of household_024d52d706dd18ce keep a storage duty the day after their youngest member turned 18.

**Rules.** Sliding scales and causes: a row opens or ends from a cause, the record of a birth, a birthday or a move, never on a schedule. An effect is a read: the engines that read the rows must see the household as it is now. One model, two tiers: counted households follow the same rule as full people, times their count.

**Done when.** In a one-year played world (buildHouseholdFirearms via worldWith in a drawn place, the seed and place named) a person who turns 18 gains the age-gated rows, and the adults of a household whose last child turns 18 have their storage duty row ended on that date, named by row id; src/core2/household-firearms.test.ts checks the open set against the household records on a later date than the law's effective date.

**Files.** src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-a.ts, src/core2/household-firearms.test.ts

**Notes.** TODO
