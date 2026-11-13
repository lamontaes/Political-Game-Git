---
id: gov-bargaining-school-districts
title: "A city public-bargaining law no longer raises school staff pay; a state law still does"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-piesiq
pr: 9055
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: left over from the pay floor work (#8939), which stopped city pay floors reaching school staff
---

**What.** A school district is a government of its own under its state. A public-sector bargaining law a town council passes covered the town's employees and also the district's teachers and staff, because bargaining read the level that funds the district (the town's budget line) and not the level whose laws bind it. Seen: a teacher's pay on the people screen and the town's school budget line after the next contract date.

**Cause.** Found in code: src/core2/law-reach/group-a-bargaining.ts, `covered`, read `publicEmployerLevel` (funding level, city for a school) where the pay floor already reads `BOUND_BY` (state for a school) in public-pay-floor.ts.

**Fix.** One shared reader, `publicEmployerBoundLevel`, in public-pay-floor.ts; bargaining coverage reads it. The funding line stays the town's. Stopgap SG row text in src/core2/data/stopgaps/gov.json no longer says a city bargaining law covers school staff.

**Time box.** 1 hour

**Rules.** One engine per mechanic. No dice. Replace, never layer.

**Done when.** A city bargaining law in force with state and federal law silent raises the pay of town police and fire jobs at the next contract date and leaves school jobs unchanged; a state bargaining law raises both; the test in src/core2/law-reach-bargaining.test.ts fails before and passes after.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-bargaining.ts, src/core2/public-pay-floor.ts, src/core2/law-reach-bargaining.test.ts, src/core2/data/stopgaps/gov.json
