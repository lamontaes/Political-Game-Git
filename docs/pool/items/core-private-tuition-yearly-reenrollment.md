---
id: core-private-tuition-yearly-reenrollment
title: "Each August the town's families are re-ranked on their cash per child and private school enrollment follows"
area: core
kind: feature
priority: 3
size: M
status: in-pr
claimed-by: claude/tuition-reenroll
pr: #5504
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T14:04:54.492Z
---

**What.** Private school enrollment is fixed at the opening: one monthly tuition contract per family, never revisited, so a family whose means change keeps or never gets a seat. Each August, re-rank the town's families with children aged 5 to 17 on their current cash per child, enroll the best-off until the NCES private share of the town's school-age children is reached, and end or start the monthly tuition contracts through the finance engine to match. The share still checks the town total and never picks a family.

**Rules.** No dice: enrollment follows the family's cash per child, never a roll. Sliding scales and causes: a family that gains or loses means moves in or out on the next August, not at a threshold on any other day. Wire to the world: each change must move tuition money between a household and a private school by journal record id.

**Done when.** In a two-year run of buildBenchWorld in a drawn place from all 56 with a private school (name place and seed), a family whose cash per child rose above the cutoff starts a tuition contract the next August and one whose cash fell below it ends theirs, by finance contract record id, the town's private share stays within the NCES figure, the cash journal balances, and src/core2/private-tuition-reenroll.test.ts proves it.

**Files.** src/core2/opening-private-tuition.ts, src/core2/modules/school.ts, src/core2/data/opening-private-tuition.json

**Notes.** Part 1 of 3 split from core-stopgap-opening-private-tuition-aggregate-spending (Oct 20).

Sent back 2026-10-20 from PR #5504 (branch claude/tuition-reenroll): merge conflict with main in src/core2/modules/school.ts (code); finish on that branch, merge main into it first.
