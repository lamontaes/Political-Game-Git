---
id: world-sale-eligibility-reads
title: "A sale, hire or rental reads the buyer or applicant rules: handgun age, age verification, discrimination"
area: world
kind: feature
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building laws-record-only-reads"
---

**What.** Checked against main on Oct 16: OPEN. Hiring, renting and sales read no discrimination ban, handgun age or age verification; their stopgaps (`SG-GOV-REACH-A-handgun-age`, `-age-verification`, `-discrimination`) are still open. Next: Hiring reads the discrimination ban. The player would see it as a choice among people, never a form.

**Rules.** An effect is a read, not a record: the engine must read the law when it decides, not log it afterward. No dice: refusal comes from the law in force and the applicant's own record. This is a game, not a spreadsheet: the player sees a refusal as a story, never a form. One rule, all 56 places: each place's law comes from data.

**Done when.** In a test in src/core2/jobs.test.ts, in a drawn place (buildBenchWorld, seed named in the PR body), a refused applicant's job-change record carries the law reason and a complaint record id reaches justice. The owner plays it: Hiring reads the discrimination ban.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/modules/justice.ts, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-handgun-age, -age-verification, -discrimination. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.
