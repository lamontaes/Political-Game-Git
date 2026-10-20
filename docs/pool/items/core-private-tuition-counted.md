---
id: core-private-tuition-counted
title: "Counted families enroll in the private school by the same yearly rule as full families"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-private-tuition-yearly-reenrollment
source: added with npm run pool -- add
---

**What.** Full families hold tuition contracts the yearly re-ranking can start and end, but counted families have no such contract, so the wider population never pays private tuition and the town's private share is met by full families alone. Give each counted group the same rule times its weight: the counted households are ranked with the full families on cash per child, and the private-school seats they take come out of the same town share, paid as a purchase flow that fill-in takes back contract by contract.

**Rules.** One model, two tiers: a counted group is ranked and pays by the same rule as a full family times its weight. An effect is a read, not a record: the tuition flow must read the household's cash per child when it enrolls. No dice.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 with a private school (name place and seed), a counted household and a full household with the same cash per child are enrolled or not together, the counted one's tuition is a purchase flow to the school by journal record id, filling it in leaves enrollment and tuition unchanged, and src/core2/private-tuition-counted.test.ts proves it.

**Files.** src/core2/opening-private-tuition.ts, src/core2/modules/residents.ts

**Notes.** Part 2 of 3 split from core-stopgap-opening-private-tuition-aggregate-spending (Oct 20).

Oct 20 (claude/tuition-counted, stacked on #5504): counted families are ranked with the full families each August by cash per child (each record times its weight against the quota); their tuition is the household part of the school merged purchase flow (`setCountedTuition`, `countedTuitionPlans`, `countedSchoolFamilies` in modules/residents.ts), opened if no counted family paid that school yet. Fill-in turns the part into a living-plan seller, unchanged in school and amount. Stopgap SG-CORE-private-tuition-counted-reenroll resolved. Test: private-tuition-counted.test.ts (drawn place, ranked, paid, filled in). Not done: a family that returns to the counts keeps no tuition until the next August (demotion only maps contracts whose id ends in the household), and a counted record that overshoots the quota takes its whole weight.
