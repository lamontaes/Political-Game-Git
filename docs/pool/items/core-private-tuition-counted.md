---
id: core-private-tuition-counted
title: "Counted families enroll in the private school by the same yearly rule as full families"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr: #5633
blocked-on:
after: core-private-tuition-yearly-reenrollment
source: added with npm run pool -- add
claimed-at:
---

**What.** Full families hold tuition contracts the yearly re-ranking can start and end, but counted families have no such contract, so the wider population never pays private tuition and the town's private share is met by full families alone. Give each counted group the same rule times its weight: the counted households are ranked with the full families on cash per child, and the private-school seats they take come out of the same town share, paid as a purchase flow that fill-in takes back contract by contract.

**Rules.** One model, two tiers: a counted group is ranked and pays by the same rule as a full family times its weight. An effect is a read, not a record: the tuition flow must read the household's cash per child when it enrolls. No dice.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 with a private school (name place and seed), a counted household and a full household with the same cash per child are enrolled or not together, the counted one's tuition is a purchase flow to the school by journal record id, filling it in leaves enrollment and tuition unchanged, and src/core2/private-tuition-counted.test.ts proves it.

**Files.** src/core2/opening-private-tuition.ts, src/core2/modules/residents.ts

**Notes.** Part 2 of 3 split from core-stopgap-opening-private-tuition-aggregate-spending (Oct 20).

Oct 20 (claude/tuition-counted, stacked on #5504): counted families are ranked with the full families each August by cash per child (each record times its weight against the quota); their tuition is the household part of the school merged purchase flow (`setCountedTuition`, `countedTuitionPlans`, `countedSchoolFamilies` in modules/residents.ts), opened if no counted family paid that school yet. Fill-in turns the part into a living-plan seller, unchanged in school and amount. Stopgap SG-CORE-private-tuition-counted-reenroll resolved. Test: private-tuition-counted.test.ts (drawn place, ranked, paid, filled in). Not done: a family that returns to the counts keeps no tuition until the next August (demotion only maps contracts whose id ends in the household), and a counted record that overshoots the quota takes its whole weight.
Oct 20 (claude, claimed and released, nothing built). The premise above is out of date: in the two-level pipeline (`src/bench/world.ts` and `src/core2/tooling/generated-world.ts`) `withPrivateTuition` runs on the whole town before `collapseToTwoLevels`, and the collapse folds each counted household's tuition contract into the merged purchase flows and keeps it on the household's record for fill-in (`src/core2/residents.ts`, the purchase-group block). So counted families already pay private tuition at the opening. What is missing is only the yearly re-ranking for them: a counted family's means cannot start or end a seat, because its contract is inside a merged flow. That is part 1's rule (`core-private-tuition-yearly-reenrollment`, claimed by `claude/tuition-reenroll`) applied to the counted tier, so this item should wait for part 1 and then read its ranking per counted group, editing the household's share of the merged flow (`amountByContract`) and its record contract on the August review.

Sent back 2026-10-20 from PR #5633 (branch claude/tuition-counted): src/core2/data/stopgaps.json adds the dated session note Resolved Oct 20 in SG-CORE-private-tuition-counted-reenroll; describe the replacement without that date note. More importantly, docs/pool/items/core-private-tuition-counted.md:21 requires a full and counted household with the same cash per child to enroll or stay out together in a one-year played world. The new test compares medians only among counted families and never proves that named full-versus-counted pair or cites the tuition journal record id. Add those required proofs.; finish on that branch, merge main into it first.
Oct 21 (fixer): sent-back fixes. The stopgap note no longer carries a date. The test now ranks the full and counted families on the list the engine itself ordered (lastTuitionRanking, kept while bookkeeping is on) and asserts, per town, that a full and a counted household rank on one list and enroll together (the one ranked first is in whenever the other is), with the closest enrolled-together and stayed-out-together pairs and the school's journal record id printed.

Sent back 2026-10-21 from PR #5633 (branch claude/tuition-counted): src/core2/private-tuition-counted.test.ts:47 advances only to the day after the August ranking, then line 178 advances another 45 days and returns. With the named 2025 start and September 16 receipt this is 239 played days, not the one-year world required by docs/pool/items/core-private-tuition-counted.md:21 and the previous send-back. The new real full/counted enrollment, purchase-flow and fill-in assertions improve the proof, but keep them through a complete 365-day run, add an exact equal-cash-per-child pair rather than only nearest pairs with gaps, and report the final record ids. Keep the date-note repair. No local gate pass is claimed.; finish on that branch, merge main into it first.
