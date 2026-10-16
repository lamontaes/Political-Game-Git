---
id: people-health-reads-custody
title: "The health engine reads whether a person is in custody when it decides care"
area: people
kind: wiring
priority: 3
size: S
status: done
claimed-by:
pr: #4766
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The health engine does not read `inCustody` (src/core2/modules/justice.ts) when it decides care, so a person in prison is treated as free to see a doctor of their choice. Make care decisions read custody at the moment they decide.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, a person serving a term makes no elective care visit while serving, shown by the health and custody record ids; released, they do.

**Files.** src/core2/modules/health.ts

**Notes.** Split out of gov-needs-opus-gov-209 (line 209 of OPUS-GOV.md), which built the voting and polling-place reads. Not checked against main beyond a search.

Sent back 2026-10-16 from PR #4766 (branch claude/health-custody): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4766 (branch claude/health-custody): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request has merge conflicts","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request has merge conflicts (HTTP 405). Draft status was verified clear before the merge attempt; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4766 (branch claude/health-custody): Merging current main into claude/health-custody conflicts in docs/pool/items/people-health-reads-custody.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
