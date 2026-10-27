---
id: tests-office-day-head-keeps-commuter-job
title: "A department head named after a death keeps their commuter job instead of the town post (office-day-name-head red on seed 8ba4740ce9a70741)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** office-day-name-head.test.ts fails on GOLDEN_PATH_SEED=8ba4740ce9a70741. The drawn place is Cedarville, Illinois, world seed ee11de5871dbd739b2efb737cbcb05685231640cbde21398d9c5def080d75790. After a head dies, the appointer names a new city administrator, but that person's jobId stays job:commuter:person_028652327d21218d:..., not job:public:town:city-administrator. Either startPublicJob does not move a commuter onto the town payroll, or the appointment pays nothing and the test's unpaid branch never sees it, because the old job is still set. The failure reproduces with main's executive code, found while building PR #6149.

**Rules.** Wire to the world: a named head is on the town's payroll for the post, or the post is recorded unpaid with its stopgap. Never loosen the test.

**Done when.** office-day-name-head.test.ts passes on GOLDEN_PATH_SEED=8ba4740ce9a70741 and on a fresh drawn seed, in a world built with buildBenchWorld. The PR names the place, the seed and the record id of the new head's town job.

**Files.** src/core2/public-payroll.ts, src/core2/modules/executive.ts, src/core2/office-day-name-head.test.ts

**Notes.** Found on PR #6149 (gov-department-head-qualified-by-record).
