---
id: people-school-choice-views-and-nearby
title: "A family's views and the schools nearby enter the choice of a private school"
area: people
kind: owner-decision
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-private-tuition-yearly-reenrollment
source: added with npm run pool -- add
---

**What.** The stopgap SG-CORE-private-tuition-average says the family's beliefs, the schools nearby and the child's own needs do not enter the choice of school. Whether belief should decide where a child goes to school is a design question, and the game holds no ruling on it. Ask the owner whether a family's views on education, their religion or their distance to a school should change which families enroll, and if so which of those the game reads.

**Rules.** Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md for any ruling on school choice before putting the question. No dice: any factor that enters is a record the choice reads, never a roll.

**Done when.** OWNER-DECISIONS.md holds the question under Open or a ruling under Ruled, a test in src/core2/private-tuition-reenroll.test.ts reads any factor ruled in by record id in a played world from buildBenchWorld in a drawn place, and the stopgap row names what remains.

**Files.** docs/coordination/OWNER-DECISIONS.md, src/core2/opening-private-tuition.ts

**Notes.** Part 3 of 3 split from core-stopgap-opening-private-tuition-aggregate-spending (Oct 20).
