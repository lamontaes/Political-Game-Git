---
id: world-hiring-discrimination-ban-refusal
title: "Hiring reads the discrimination ban: a decision whose recorded reasons cite a protected trait is refused, and the job-change record carries the law reason"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-hiring-bias-reasons
source: added with npm run pool -- add
---

**What.** Hiring reads the discrimination ban. A hiring decision whose recorded reasons cite a protected trait is refused by the engine, and the job-change record carries the law reason. Today the ban exists as a law but no engine reads it when an employer picks an applicant. Read the ban in force where the employer is at the moment the hiring choice is made, refuse a choice that rests on a protected trait, and record the refusal with the law's id so the applicant and the justice engine can read it.

**Rules.** An effect is a read, not a record: the hiring engine reads the ban when it decides, and the refusal is a recorded reason on the job-change record. No dice: the refusal follows from the recorded reasons against the law. Ask why: the record names the law and the reason that tripped it. One rule, all 56 places: the ban is place data and no place is named in code.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a hiring choice that cited a protected trait is refused and the job-change record carries the law's record id, and a test in src/core2 proves a place without the ban hires as before. The owner plays it: an employer cannot turn someone away for a protected trait where the ban holds.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/

**Notes.** Written from the title on Oct 19 so the item meets the quality gate. Waits on world-hiring-bias-reasons.
