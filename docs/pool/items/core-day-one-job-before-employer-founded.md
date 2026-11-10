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
after:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The opening's job start (population.ts openingJobStart, a commitment's heldSince) and the business pass's founding dates (business.ts businessHistory, ranked by size) are made separately, so a worker can hold a job since a date before the business pass says their employer was founded. Found by src/core2/past-work.test.ts (history-past-work) in a drawn place. Seen: a person's card, where a job can start before the firm that employs them was founded; a test finds it in a drawn place.

**Cause.** Found in code: src/core2/population.ts `openingJobStart` (called at about line 1105, from the organization's `formedAt` in the world's history) dates a commitment's `heldSince`, while src/core2/modules/business.ts `businessHistory` (line 2452) separately dates each business's founding, ranked by size, so a worker can hold a job since a date before their employer's `business.founded`. Found by src/core2/past-work.test.ts in a drawn place.

**Fix.** Make one read the other: the founding date is not later than the earliest job start, or the job start is clamped to the founding. Check it with a test over a drawn place.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Wire to the world: one engine's date must not contradict another's; the founding date or the job start reads the other.

**Done when.** A second session, in a drawn place built with buildBenchWorld (place and seed named), sees no commitment's heldSince precede its organization's business.founded record, by commitment and founding record id, and a test in src/core2/past-work.test.ts fails when the two dates are made independent again.

**Waits on.** Nothing.

**Files.** src/core2/population.ts, src/core2/modules/business.ts, src/core2/past-work.test.ts

**Notes.** TODO
