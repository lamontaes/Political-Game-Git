---
id: play-politics-term-details
title: "The Politics sheet shows each term's service, start and end dates, how it was won, and the seat's past elections"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by:
pr: #4651
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The Politics sheet shows each term's service, start and end dates, how it was won, and the seat's past elections. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/play-politics-term-details, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/play-politics-term-details.md and the files that pull request #4651 changes on claude/play-politics-term-details

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4651 (branch claude/play-politics-term-details): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4651 (branch claude/play-politics-term-details): merging main conflicts in src/bench/government.ts, src/bench/play.mjs (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4651 (branch claude/play-politics-term-details): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
