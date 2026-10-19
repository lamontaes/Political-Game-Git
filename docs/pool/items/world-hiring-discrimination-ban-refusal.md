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

**What.** Hiring reads the discrimination ban. A hiring decision whose recorded reasons cite a protected trait is refused, and the job-change record carries the law reason for the refusal. Today an employer's reasons are not checked against the law, so the ban changes nothing in play. The refusal sends the employer to the next applicant and leaves a record the justice engine can hear.

**Rules.** No dice: the refusal follows the recorded reasons and the law in force, never a roll; An effect is a read, not a record: the jobs engine reads the ban at the moment the employer decides and the refusal changes who is hired; The chain is the acceptance: follow one refused hire to the reasons recorded, the law read, the next applicant hired and the record left; One rule, all 56 places: the ban is law data, never a named place.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, a hiring decision citing a protected trait is refused, the job-change record carries the law reason by record id, the next applicant is hired, and a test in src/core2 shows it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/laws.ts

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
