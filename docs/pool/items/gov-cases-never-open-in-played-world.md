---
id: gov-cases-never-open-in-played-world
title: "No constituent case ever opens in the played world (Hope, New Mexico)"
area: gov
kind: bug
priority: 2
status: done
claimed-by:
pr: #4728
blocked-on:
milestone:
source: "found while building office-stopgap-office-day-acts-rule-copy, Oct 16"
claimed-at:
---

**What.** No constituent case ever opens in the played world (Hope, New Mexico). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/gov-cases-never-open, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-cases-never-open-in-played-world.md and the files that pull request #4728 changes on claude/gov-cases-never-open

**Notes.** The rule for deciding a case is already one rule (`ownCaseDecision`); this item is about cases arriving.

Looked at Oct 16 (claude/cases-never-open), not built. Where the build has to start: `officeHours` in constituent-cases.ts walks `api.state.people` in the town (full people only) and `problemOf` reads a full person's work commitments and `liquidMinor`. A counted resident has neither: their job is a counted job (`countedJobsOf`, jobs.ts `countedSeekers` for the out-of-work), and their money is not their own, since counted households are packed into groups whose pooled fund (`countedFundOf` in residents.ts) holds it, so "how thin is their cushion" has no per-person figure to read. Counted workers paid under the floor are also raised to it the day the law takes effect (`raiseToFloor` in laws.ts), so that problem is rare for them by design. So the build is three decisions, not a loop: (1) the counted unemployed are `countedSeekers` rows in the town, with the group's fund per member against the average living cost as their cushion (a stated estimate); (2) the reach-out decision runs on `residentPerson(core, id)` traits through `decisionLean`; (3) a case reaching an official fills the resident in (`personOrFillIn`) before the row is written, so `argues`, `relationship` and the view of the official land on a full person. Do it once the cushion rule is chosen; the monthly walk over `countedSeekers` in the town is small, so there is no daily scan.

Sent back 2026-10-16 from PR #4728 (branch claude/gov-cases-never-open): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4728 (branch claude/gov-cases-never-open): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4728 (branch claude/gov-cases-never-open): merging main conflicts in src/core2/modules/constituent-cases.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4728 (branch claude/gov-cases-never-open): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request has merge conflicts","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request has merge conflicts (HTTP 405). Draft status was verified clear before the merge attempt; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4728 (branch claude/gov-cases-never-open): Merging current main into claude/gov-cases-never-open conflicts in src/core2/modules/constituent-cases.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
