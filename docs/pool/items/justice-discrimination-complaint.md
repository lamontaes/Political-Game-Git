---
id: justice-discrimination-complaint
title: "A refused applicant's complaint reaches the justice engine as a civil complaint record the commission hears"
area: world
kind: feature
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
after: world-hiring-discrimination-ban-refusal
source: added with npm run pool -- add
---

**What.** A refused applicant brings a complaint the justice engine hears: a civil complaint record naming the employer, the law row and the refusal's job-change record, which the human rights commission in the law's enforcer field weighs. The commission may fine the employer. Today complaints in justice are crime reports only, so a civil complaint is a new kind built on the same complaint table, not a second justice system.

**Rules.** An effect is a read, not a record: the commission reads the refusal record and the law's penalty. No dice: the finding follows the recorded reasons. Wire to the world: the fine moves money from the employer to the commission and the applicant. Ask why: the finding cites the refusal record.

**Done when.** In a one-year run of buildBenchWorld in a drawn place and seed (named in the PR body), a refused applicant's complaint record id reaches the justice engine, the commission's finding cites the refusal's job-change record, and the fine appears on the journal; a test in src/core2/justice.test.ts shows it.

**Files.** src/core2/modules/justice.ts, src/core2/modules/jobs.ts, src/core2/data/stopgaps.json

**Notes.** Split from world-sale-eligibility-reads (an L item) on Oct 19; the owner's ruling is in docs/coordination/OWNER-DECISIONS.md, "Employer passing over an applicant (#5102)": the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. Stopgap SG-GOV-REACH-A-discrimination.
