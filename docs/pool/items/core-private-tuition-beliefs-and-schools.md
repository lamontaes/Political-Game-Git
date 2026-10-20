---
id: core-private-tuition-beliefs-and-schools
title: "Private tuition enrollment follows the family's faith and the schools nearby, and moves as they change"
area: core
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/tuition-continuing
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T12:59:03.103Z
---

**What.** SG-CORE-private-tuition-average still fakes enrollment: after PR 5667 the opening ranks families by cash per child scaled by their faith's affinity for private schooling, but enrollment is fixed at the opening, ignores which schools stand nearby or what the child needs, and the affinity is by faith only. Move each child's enrollment from the family's income, beliefs and the schools in reach, re-decided as those change (a job loss, a closing, a move), and close the stopgap row with the reader named. Look at docs/coordination/OWNER-DECISIONS.md first: the owner ruled on private school (#5483) on Oct 20.

**Rules.** No dice: enrollment follows money, beliefs and the schools nearby, never a percentage; real shares check the town total only. An effect is a read: the tuition flow and the school's roll read the enrollment record. One model, two tiers: counted families follow the same rule times their count. Replace, never layer: the opening-only ranking is deleted when the continuing rule replaces it.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (name place and seed) a family whose income falls drops a child from a private school and a family that gains enrolls one, each by record id with the cash journal balanced; the town's private share stays within the NCES spread; src/core2/opening-private-tuition.test.ts and private-tuition-reenroll.test.ts cover it and SG-CORE-private-tuition-average is resolved in stopgaps.json.

**Files.** src/core2/opening-private-tuition.ts,src/core2/private-tuition-reenroll.ts,src/core2/private-tuition-choice.ts,src/core2/data/stopgaps.json

**Notes.** TODO
