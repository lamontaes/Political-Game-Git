---
id: world-layoffs-proof
title: "Finish #4380: joint turnover proof against JOLTS on the #4329 seed"
area: world
kind: research
priority: 1
status: done
claimed-by:
pr: #4591
blocked-on:
milestone:
source: "reissue item 5; PR #4380 branch world/session-b-layoffs-followup"
claimed-at:
---

**What.** Finish #4380: joint turnover proof against JOLTS on the #4329 seed. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: merging main conflicts in src/bench/play.mjs, src/core2/modules/jobs.ts (code or data, left for the author); resolve and push. Finish it on the existing branch world/session-b-layoffs-followup, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-layoffs-proof.md and the files that pull request #4380 changes on world/session-b-layoffs-followup

**Notes.** None.

Sent back 2026-10-16 from PR #4380 (branch world/session-b-layoffs-followup): merging main conflicts in src/bench/play.mjs, src/core2/modules/jobs.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4591 (branch claude/world-layoffs-proof): merging main conflicts in src/core2/modules/business.ts, src/core2/modules/jobs.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4380 (branch world/session-b-layoffs-followup): Sent back by the merger: merging main conflicts in src/bench/play.mjs, src/core2/modules/jobs.ts (code or data, left for the author); resolve and push Finish on this branch (merge main into it first), then it goes back in line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4591 (branch claude/world-layoffs-proof): Morning check: this World branch also changes the Play files src/bench/calendar.ts and src/bench/play.mjs and the government press files src/core2/press-desk.ts and src/core2/press-topics.ts. No agreement from those owning areas is recorded in the PR body or discussion. Record the owners’ agreement or split those edits onto the owning areas’ PRs before merging. The earlier jobs/business merge conflicts are resolved; current main merges cleanly; finish on that branch, merge main into it first.
