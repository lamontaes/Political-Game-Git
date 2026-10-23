---
id: world-school-income-same-tiers
title: "School income fifth stays the same when a household is filled in"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5609
blocked-on:
source: "Merger review of PR #5609, branch effect-web-schools"
claimed-at:
---

**What.** PR #5609's school-outcomes reader classifies a full student from household job wages alone. Its counted path reads the household's wages, retirement and unplaced-worker pay through groupKeyOf, so meeting a student can change their income fifth while their recorded pay continues. Use the same recorded household-income basis in both paths instead of dropping income when a person is filled in.

**Rules.** One model, two tiers: filling someone in preserves the facts the counts already record. An effect is a read, not a record: the school engine reads the household's actual recorded income when choosing its income fifth and web context. Use the existing money records and readers rather than adding a second income simulation.

**Done when.** A one-year buildBenchWorld run in a place drawn from all 56, with its full seed and student, household and income-source record IDs named, shows that a filled-in student's school income basis includes the same wage, retirement and unplaced-pay sources as the counted path. A regression in src/core2/school-outcomes.test.ts requires a positive non-job income source and proves that fill-in alone, with the relevant records fixed, does not change the student's income fifth or the corresponding web factor. The changed-file school checks pass with the named records in the PR body.

**Files.** src/core2/school-outcomes.ts, src/core2/school-outcomes.test.ts, src/core2/modules/residents.ts

**Notes.** Found on integrated PR head 594af331c36318993f7de85cc9cd317453d63d89. A focused diagnostic built Del Carmen, Puerto Rico (7223341), world seed 718c331a508c5960947ad3e6371198f3e092ae9140152916aafc788f9c41a2ea, draw seed 81ea428901414bdc90c9471c9ecc60ff, and invoked the school reader on the generated household after fill-in. Student person_827435f90b691499 in household_790279f07f0744fd changed from counted income fifth 1 (about 3,398,000 annual cents) to full fifth 0 (about 1,205,300 wage cents). Live flow residents:unplaced-wages:jurisdiction_0a25325f78916101:household_790279f07f0744fd still paid 84,134 cents every 14 days. School result school.math-proficient-pct:person_827435f90b691499:2024 omitted that pay. This was a classification diagnostic, not a completed annual acceptance run.

Sent back 2026-10-21 from PR #5609 (branch effect-web-schools): Full students use job wages only while counted students include retirement and unplaced pay; Del Carmen student person_827435f90b691499 changes from income fifth 1 to 0 after fill-in while the 84,134-cent fourteen-day unplaced-pay flow remains live. Use one household-income basis and add a transition regression.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5639 (branch effect-web-integration): The capstone carries the same full-wages-only versus counted total-income school classification defect at school-outcomes.ts:128-169; use one income basis and prove fill-in preserves the fifth with positive non-job income; finish on that branch, merge main into it first.
