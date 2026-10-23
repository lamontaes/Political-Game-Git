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
claimed-at:
---

**What.** Make the hiring step in jobs.ts read the discrimination ban when it picks. In `runWeek` an employer offers its best-placed applicant; when world-hiring-bias-reasons has recorded the owner's reasons for that pick, check whether the employer holds an open discrimination reach row (written by `writeRows` in law-reach/group-a-records.ts for the law key us-policy-positions with the employers spec) and whether the recorded reasons cite a protected trait. If both hold, the offer is refused: the employer moves to the next applicant, and the refused applicant's job-change record carries the law reason and the reach row's law id. In a place with no ban in force the same decision stands and the record is unchanged. The refused applicant learns why from the record (not from a form), which is what justice-discrimination-complaint reads.

**Rules.** An effect is a read, not a record: the reach row is read at the moment of the hire, and the refusal is read by the next applicant's turn and by the complaint. No dice: refusal follows from the law row and the recorded reasons. One rule, all 56 places: the ban comes from the place's law data, not from code that names a place. This is a game, not a spreadsheet: the applicant meets a refusal as a story line told by the English engine, never a form. Replace, never layer: the employer half of SG-GOV-REACH-A-discrimination is narrowed to rentals in stopgaps.json and the row text updated. Ask why: the refusal answers why by reasons record, law id and reach row id.

**Done when.** In a test in src/core2/jobs.test.ts and a one-year run of buildBenchWorld in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), an applicant whose pick cited a protected trait in a place with the ban has a job-change record carrying the law reason and reach row id and the employer's next applicant is hired, the same decision stands in a place without the ban, and the stopgap row now names only rentals.

**Files.** src/core2/modules/jobs.ts, src/core2/law-reach/group-a-records.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.

Oct 20 (pool feeder): spec written; after world-hiring-bias-reasons (claimed), which in turn waits on world-employer-attitude-table (open); the refusal has nothing to read until reasons exist. The reach rows for employers already exist as laws apply (group-a-records.ts); no new law data is needed.
