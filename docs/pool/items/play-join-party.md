---
id: play-join-party
title: "The player joins a party from /play"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by:
pr: #4706
blocked-on:
source: "split from gov-next, Oct 16"
claimed-at:
---

**What.** The player joins a party from /play. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/play-join-party, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/play-join-party.md and the files that pull request #4706 changes on claude/play-join-party

**Notes.** Split from gov-next. The campaign day controls (doors, volunteers, donations, endorsements, ad, poll) already exist.

Sent back 2026-10-16 from PR #4706 (branch claude/play-join-party): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4706 (branch claude/play-join-party): Merging current main into claude/play-join-party conflicts in src/bench/data/controls.json, src/bench/play.mjs. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4706 (branch claude/play-join-party): merging main conflicts in src/bench/data/controls.json, src/bench/play.mjs (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
