---
id: people-school-attendance-circumstances
title: "School attendance reads the child's illness and household, then the trait at its size"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr: #5811
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Children attend 99.95% of school days and the choice reads no illness or household circumstance; add them and calibrate the trait term.

**Rules.** TODO

**Done when.** TODO

**Files.** src/core2/modules/school.ts

**Notes.** TODO

Sent back 2026-10-21 from PR #5811 (branch claude/school-attendance): The new school proof can test an adult instead of a child: src/core2/school.test.ts:130-131 picks the first sick person from every living full person with no school-age/eligibility filter, then :137-140 directly scores STAY_HOME for that arbitrary actor. It can therefore pass without any sick pupil or ordinary school attendance choice. Require a nonempty school-age care-need case and follow the recorded school choice/reason for that named child. The test runs 200 days at :129, while the newly written Done when calls for a one-year buildBenchWorld run; supply that named proof or use an accurately bounded slice. The body also explicitly leaves household circumstances/calibration unfinished. Its Touches pool item prefix does not protect that unfinished parent: I ran itemForMergedPr here, and it returns people-school-attendance-circumstances through the status in-pr / pr #5811 fallback. Use a bounded illness-only completion item and keep the broader work open, or finish the linked acceptance; verify the real completion helper. No local standard gate pass or feature completion is claimed for this source review.; finish on that branch, merge main into it first.
