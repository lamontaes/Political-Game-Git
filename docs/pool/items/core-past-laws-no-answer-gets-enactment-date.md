---
id: core-past-laws-no-answer-gets-enactment-date
title: "A 'no' policy answer gets an enactment date in the law history"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The law history (src/core2/past-laws.ts:441-443) treats every starting policy answer as a law in force at the opening, so an answer of 'no', where the place has no such law, still gets an enactment date and a roll call. In a played year in Pinopolis, South Carolina (seed 54a757e867ea, scripts/research/core-parameters-year.ts), the state's 'no' on Medicaid expansion carries an enactment 16.80 years before day one (law-history:law:US-SC:state:us-policy-positions:health-human-services.expand-medicaid-eligibility:general:starting), though South Carolina never expanded Medicaid. Give an answer that means no such law exists no enactment record, or the enactment of the law that ended it where the research records one, so the record never shows members voting on a law that was not passed.

**Rules.** Ask why: every roll call in the record must trace to a law the research says passed, and an answer meaning no such law has no passage to cite. An effect is a read: the record engine and the director read these histories, so a passage that never happened reaches voters.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), no law history record for a starting policy answer that means no such law carries an enactment date or roll call, shown by record ids, and src/core2/past.test.ts passes with a case for such an answer.

**Files.** src/core2/past-laws.ts, src/core2/past.test.ts

**Notes.** TODO
