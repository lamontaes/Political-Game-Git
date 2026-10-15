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

**What.** Purchases are aggregate money flows, so handgun purchase age, social media age verification and the discrimination ban have nothing to read at the moment of a sale. Each needs a transaction with a person: a store sells to a buyer, a platform opens an account, an employer or landlord weighs an applicant. That transaction reads the law at the moment it decides and refuses or admits by the person's own record. Start with one: hiring and renting weigh an applicant, and a refused applicant can bring a complaint the justice engine hears.

**Rules.** An effect is a read, not a record: the engine must read the law when it decides, not log it afterward. No dice: refusal comes from the law in force and the applicant's own record. This is a game, not a spreadsheet: the player sees a refusal as a story, never a form. One rule, all 56 places: each place's law comes from data.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56 with a discrimination ban, seed named) the hiring or renting engine reads the law at the decision, a refused applicant's record id shows the reason, and a complaint record id reaches the justice engine. The test in src/core2/jobs.test.ts or src/core2/housing.test.ts covers it, and the stopgap row closes. The owner plays it: apply for an apartment and be refused for a reason the law bars.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/housing.ts, src/core2/modules/justice.ts, src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-handgun-age, -age-verification, -discrimination. Split out of laws-record-only-reads on Oct 15; Session A had already checked main and found no record to read.
