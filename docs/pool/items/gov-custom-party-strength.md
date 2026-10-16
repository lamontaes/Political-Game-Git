---
id: gov-custom-party-strength
title: "A custom world's party strength and lean shift reach voters"
area: gov
kind: wiring
priority: 3
size: M
status: done
claimed-by:
pr: #4712
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** `politics.partyStrength` is validated and read nowhere; `leanShift` moves district lean in campaigns but counted voters' lean in the electorate ignores it. Make the elections and the counted voter groups read both.

**Rules.** One model, two tiers; an effect is a read.

**Done when.** A one-year run of the played world (buildBenchWorld, a drawn place) with partyStrength doubled for one party shows a changed vote share and counted voter lean by election record id, and a test passes.

**Files.** src/core2/electorate.ts, src/core2/modules/campaigns.ts, src/core2/modules/voting.ts, src/core2/world-settings.ts

**Notes.** core.md line 213, checked Oct 15.

Sent back 2026-10-16 from PR #4712 (branch claude/custom-party-strength): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4712 (branch claude/custom-party-strength): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
