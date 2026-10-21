---
id: elections-counted-voters-read-group-stances
title: "A counted voter group's appeal reads the group's own stance per question, not the lean stand-in"
area: elections
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5501
blocked-on:
after: people-opening-stance-formation
source: added with npm run pool -- add
claimed-at:
---

**What.** countedAppeal in electorate.ts still reads a counted voter's recognition of a candidate through platformAgreement(lean, platform), the lean-times-axis stand-in, while full people read agreementWith. Give each counted group the stance its members' traits imply (the same formation rule times the count) and read it there, so a counted voter and a full voter of the same traits agree with a platform alike.

**Rules.** One model, two tiers: the counted group is read by the same rule as a full person, times its count. No dice. The chain is the acceptance.

**Done when.** In a drawn place (buildBenchWorld, seed named) a counted group and a full person of the same traits get the same agreement with one candidate's platform, shown by group and person ids, and platformAgreement has no remaining caller in src/core2; a case in src/core2/electorate-weight.test.ts covers it.

**Files.** src/core2/electorate.ts, src/core2/campaign-views.ts, src/core2/modules/views.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5501 (branch claude/counted-stances): Merging current origin/main conflicts in data/research/people/opening-stance-loadings.json, scripts/research/build-stance-loadings.py, and src/core2/modules/views.ts. Resolve the generator and views conflicts, regenerate the data, and rerun the same-person counted-versus-filled agreement proof. Its parent #5495 is still open, so this fixer remains based there; no pool item will be marked done for a non-main merge.; finish on that branch, merge main into it first.
