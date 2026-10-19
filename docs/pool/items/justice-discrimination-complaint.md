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

**What.** A job applicant whose hire was refused for a reason the law bans can bring a complaint. The complaint reaches the justice engine as a civil complaint record that cites the refusal and the law in force, and the commission or court hears it as it hears any other case. Today the justice engine hears only corruption cases, so a refusal that breaks the discrimination ban goes nowhere. The player would see it as a neighbor who was turned down and what came of it.

**Rules.** No dice: whether a complaint is brought and how it is decided follow the applicant's situation, the record of the refusal and the law in force, never a roll; An effect is a read, not a record: the justice engine reads the refusal record and the ban when it hears the case, and a finding changes the employer's books or the applicant's pay; The chain is the acceptance: follow one refused applicant from the hiring decision to the complaint, the hearing, the finding and what changed for them; One rule, all 56 places: the body that hears it comes from the state's law data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, a refused applicant's complaint appears as a civil complaint record naming the refusal record id and the law, the justice engine hears it, and a test in src/core2/modules shows the finding and what it changed.

**Files.** src/core2/modules/justice.ts, src/core2/modules/jobs.ts

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
