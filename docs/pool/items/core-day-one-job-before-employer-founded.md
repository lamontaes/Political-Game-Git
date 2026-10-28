---
id: core-day-one-job-before-employer-founded
title: "A day-one job can start before its employer's founding date"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The opening's job start (population.ts openingJobStart, a commitment's heldSince) and the business pass's founding dates (business.ts businessHistory, ranked by size) are made separately, so a worker can hold a job since a date before the business pass says their employer was founded. Found by src/core2/past-work.test.ts (history-past-work) in a drawn place.

**Rules.** Wire to the world: one engine's date must not contradict another's; the founding date or the job start reads the other.

**Done when.** In buildBenchWorld in a drawn place, no commitment's heldSince precedes its organization's business.founded record, checked by a test.

**Files.** src/core2/population.ts, src/core2/modules/business.ts

**Notes.** TODO
