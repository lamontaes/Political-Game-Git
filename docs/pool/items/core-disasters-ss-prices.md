---
id: core-disasters-ss-prices
title: "Real disasters through Oct 9 2026, Social Security under the law in force, steady prices, a year under two minutes (#4125)"
area: core
kind: feature
priority: 2
status: done
claimed-by:
pr: #4599
blocked-on:
milestone:
source: "open PR #4125"
claimed-at:
---

**What.** Real disasters through Oct 9 2026, Social Security under the law in force, steady prices, a year under two minutes (#4125). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: the PR body itself lists a play-stopping bug it introduces: 2 of 8 one-year played runs stop on January 1 with 'Duplicate institutional calendar key' (src/core2/law-reach/group-a-staffing.ts:108) when a county and its town both change the same budget line; the body also says the slowest day is still over budget and that the speed-guard rule change needs the CTO's sign-off. A merge would ship a game that can stop on New Year's Day. Fix the staffing duplicate (the one-line fix the body describes, with a core-area sign-off on the government file), rerun the two stopping seeds named in the body, and merge main (this branch also deletes src/core2/data/social-security-ages.json, which the open PR #4503 changes). Finish it on the existing branch opus-core, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/core-disasters-ss-prices.md and the files that pull request #4125 changes on opus-core

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #4125 (branch opus-core): code conflict with main in scripts/zero-dice-guard.mjs, src/core2/choice.ts, src/core2/module-data.ts; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)

Sent back 2026-10-16 from PR #4125 (branch opus-core): the PR body itself lists a play-stopping bug it introduces: 2 of 8 one-year played runs stop on January 1 with 'Duplicate institutional calendar key' (src/core2/law-reach/group-a-staffing.ts:108) when a county and its town both change the same budget line; the body also says the slowest day is still over budget and that the speed-guard rule change needs the CTO's sign-off. A merge would ship a game that can stop on New Year's Day. Fix the staffing duplicate (the one-line fix the body describes, with a core-area sign-off on the government file), rerun the two stopping seeds named in the body, and merge main (this branch also deletes src/core2/data/social-security-ages.json, which the open PR #4503 changes); finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4599 (branch claude/core-disasters-ss-prices): merging main conflicts in src/core2/choice.ts, src/core2/modules/retirement-claims.ts, src/core2/retirement-claim.ts, src/core2/retirement-claims.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Looked at 2026-10-16 (claude session), not merged: PR 4599 and main now hold two designs of Social Security under the law in force. The branch carries `src/core2/social-security-statute.ts` and a law context (birth year and law) in `retirement-claim.ts` and `modules/retirement-claims.ts`; main carries `SocialSecurityAges` (`social-security-law.ts`, `socialSecurityAges` in the laws module) read through `agesFor`. Merging main conflicts in retirement-claim.ts, modules/retirement-claims.ts, retirement-claims.test.ts, choice.ts, stopgaps.json and speed-memory.mjs. The core area chooses which design stays (replace, never layer); then the duplicate institutional calendar key in law-reach/group-a-staffing.ts line 108 and the speed-guard sign-off the merger asked for.

Sent back 2026-10-16 from PR #4599 (branch claude/core-disasters-ss-prices): Sent back by the merger: merging main conflicts in src/core2/choice.ts, src/core2/modules/retirement-claims.ts, src/core2/retirement-claim.ts, src/core2/retirement-claims.test.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4599 (branch claude/core-disasters-ss-prices): Merging current main into claude/core-disasters-ss-prices conflicts in src/core2/residents-economy.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
