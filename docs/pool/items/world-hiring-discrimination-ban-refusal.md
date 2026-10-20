---
id: world-hiring-discrimination-ban-refusal
title: "Hiring reads the discrimination ban: a decision whose recorded reasons cite a protected trait is refused, and the job-change record carries the law reason"
area: world
kind: feature
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: world-hiring-bias-reasons
source: added with npm run pool -- add
---

**What.** Hiring reads the discrimination ban in force when it decides. A hire whose recorded reasons cite a protected trait is refused in a place whose law bans it, and the employer picks the next applicant; where no ban is in force the same decision stands. The refused applicant's job-change record carries the law reason and the law row id. This closes the hiring half of SG-GOV-REACH-A-discrimination for employers.

**Rules.** An effect is a read, not a record: the law is read at the moment of the hire. No dice: refusal follows from the law and the recorded reasons. One rule, all 56 places: the ban comes from the place's law data. This is a game, not a spreadsheet: the applicant sees a refusal as a story line, never a form.

**Done when.** In a test in src/core2/jobs.test.ts and a one-year run of buildBenchWorld in a drawn place (name and seed in the PR body), an applicant refused for a protected trait in a place with the ban has a job-change record carrying the law reason, the same decision stands in a place without it, and the stopgap row is narrowed to rentals.

**Files.** src/core2/modules/jobs.ts, src/core2/law-reach/group-a-records.ts, src/core2/data/stopgaps.json

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.
