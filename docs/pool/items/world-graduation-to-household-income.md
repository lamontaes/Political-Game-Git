---
id: world-graduation-to-household-income
title: "A place's graduation change reaches later household incomes through hire pay"
area: world
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-schooling-to-pay
source: added with npm run pool -- add
---

**What.** Hire pay now follows each hire's schooling (world-schooling-to-pay), but nothing shows a place whose graduation share rises later paying higher household incomes. Show the chain: the school module's graduation record, the education fact it writes, the hire pay it sets, the paycheck, the household income the poverty measure reads. If the education fact is not updated when a student graduates, write it, so a graduating cohort is hired at its new level.

**Rules.** An effect is a read, not a record: the hire pay must read the updated education fact. Wire to the world: shown in a played world, by record ids. No dice.

**Done when.** In a played world in a drawn place (place and seed named), a student who graduates gets an education fact at the new level by record id, is later hired at the pay that level sets, and the household income the poverty measure reads includes it, shown by a test; twin worlds with higher and lower graduation differ in hire pay.

**Files.** src/core2/modules/school.ts,src/core2/modules/jobs.ts,src/core2/world-metrics.ts

**Notes.** TODO
