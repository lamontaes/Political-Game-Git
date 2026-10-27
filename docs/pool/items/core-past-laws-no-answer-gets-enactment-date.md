---
id: core-past-laws-no-answer-gets-enactment-date
title: "A 'no' policy answer gets an enactment date in the law history"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #6140
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The law history (src/core2/past-laws.ts:441-443) treats every starting policy answer as a law in force at the opening, so an answer of 'no', where the place has no such law, still gets an enactment date and a roll call. In a played year in Pinopolis, South Carolina (seed 54a757e867ea, scripts/research/core-parameters-year.ts), the state's 'no' on Medicaid expansion carries an enactment 16.80 years before day one (law-history:law:US-SC:state:us-policy-positions:health-human-services.expand-medicaid-eligibility:general:starting), though South Carolina never expanded Medicaid. Give an answer that means no such law exists no enactment record, or the enactment of the law that ended it where the research records one, so the record never shows members voting on a law that was not passed.

**Rules.** Ask why: every roll call in the record must trace to a law the research says passed, and an answer meaning no such law has no passage to cite. An effect is a read: the record engine and the director read these histories, so a passage that never happened reaches voters.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), no law history record for a starting policy answer that means no such law carries an enactment date or roll call, shown by record ids, and src/core2/past.test.ts passes with a case for such an answer.

**Files.** src/core2/past-laws.ts, src/core2/past.test.ts

**Notes.** TODO

Merger 0: Sent back 2026-10-26 from PR #6140 (branch claude/past-laws-no-answer): own merged-tree validation blocked by the merger workspace's invalid GH_TOKEN/HTTP401, preventing real-head fetch and main integration/push; no code defect claimed. Status/Notes updated via connected GitHub because the pool CLI cannot authenticate. Finish validation on that branch with working checkout credentials, merge main into it first.

Merger 0: Rechecked after authentication recovered, 2026-10-26, PR #6140 branch claude/past-laws-no-answer, merged head 85bc543f69253e4bdbc62abb10f18b16ec383c56. Sent back because past.test.ts:46 uses production noSuchLaw as its expected-case oracle: dropping only the value check wrongly removed 15 valid YES-policy histories (43 to 58 classified absent) in Bartlett TN 4703440, PAST_SEED 01fcd1cfc2a8808218f7a8964b31614b, while all 10 unchanged tests still passed. Source restored exactly, no control committed. Add independent negative and positive history checks that catch this overreach, and publish the full annual Ormond Beach seed rather than 19709f62…7009. Scoped gates pass except the identical main pool diagnostics; current open CLI succeeds. This actual test/proof reason supersedes the resolved authentication blocker. Finish on that branch, merge main into it first.
