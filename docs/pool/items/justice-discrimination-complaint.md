---
id: justice-discrimination-complaint
title: "A refused applicant's complaint reaches the justice engine as a civil complaint record the commission hears"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-hiring-discrimination-ban-refusal
source: added with npm run pool -- add
---

**What.** An applicant refused a job because of a protected trait can complain, and the complaint reaches the justice engine as a civil complaint record that the commission hears. Today a refusal that the discrimination ban forbids leaves no record the justice engine can read. When the hiring engine refuses a decision that cited a protected trait and the applicant learns the reason, the applicant files a complaint from their own traits, money and the law in force, and the justice engine opens a civil matter with the hiring decision's reasons attached. The commission's hearing and finding come from the evidence and the law, never a roll.

**Rules.** No dice: whether an applicant complains comes from what they learned, their traits and what a complaint costs them, and the finding comes from the recorded reasons against the law. Ask why: the complaint cites the hiring decision's record id and the law that bans the practice. An effect is a read, not a record: the justice engine reads the complaint when it opens a matter and the commission reads the evidence when it rules. One rule, all 56 places: the ban and the commission are place data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a refused applicant's complaint appears as a civil complaint record naming the hiring decision and the law, the commission's hearing reads it, and a test in src/core2 proves the chain by record id. The owner plays it: an applicant turned away for a protected trait is heard by the commission.

**Files.** src/core2/modules/justice.ts, src/core2/modules/jobs.ts, src/core2/data/justice/

**Notes.** Written from the title on Oct 19 so the item meets the quality gate. Waits on world-hiring-discrimination-ban-refusal.
