---
id: core-counted-hire-calendar-other-employer
title: "Meeting a counted worker hired by a new business throws: their payday calendar is another employer's"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A counted worker hired into a role keeps the role's schedule and payday with their household, so they are on payroll the day they are met. When the role's template job belongs to another employer, as it does at a business founded in play, the counted hire kept that other employer's payroll calendar. Filling the worker in then fails the payroll check that the calendar, job and commitment name one employer, and the played world stops: Paris, Arkansas (seed ew20oct26) throws on 2026-01-15 when an official's staff review hires from the counts (job:position:organization:founded:manufacturing:person_90d91b0220fbffce:2025-09-01:2026-01-01:1:person_81b4ec00b9739381, calendar from organization_87f245250cd0d555).

**Rules.** Fix at the cause, the way a full hire does it: the hire's calendar is the employer's own copy of the role's. Speed: no more than one kept calendar per employer and role calendar.

**Done when.** Paris, Arkansas (seed ew20oct26) plays 400 days in buildBenchWorld without the throw, and in a played year of a drawn place every counted household's work commitment names a kept calendar of its own employer, checked in src/core2/counted-household-jobs.test.ts, which fails with the fix removed.

**Files.** src/core2/modules/jobs.ts,src/core2/counted-household-jobs.test.ts

**Notes.** Found Oct 24 by the effects lead when the year-long twin check crashed in Paris, Arkansas. The counted-jobs fix that keeps a counted hire on payroll (core-counted-household-jobs-in-step) reached main inside #5609; this is its gap.
