---
id: gov-campaign-turn-interview-declined
title: "campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4753
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/pool-reporter-interview, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-campaign-turn-interview-declined.md and the files that pull request #4742 changes on claude/pool-reporter-interview

**Notes.** TODO

Sent back 2026-10-16 from PR #4742 (branch claude/pool-reporter-interview): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4751 (branch claude/gov-campaign-turn-interview): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4753 (branch claude/campaign-turn-interview): campaign-turn.test.ts adds if (!row) return when no local outlet invites, bypassing answerInterview and the existing assertion that questions change once answered. The PR body acknowledges this weaker ending. Keep the decline edge case separately and ensure the original fixture reaches an invitation and the changed-question assertions; the merger morning check forbids skipped or weakened tests. The same correction applies to sibling PR #4751; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4753 (branch claude/campaign-turn-interview): merging main conflicts in docs/release/changes/gov-campaign-turn-interview-declined.md, src/core2/campaign-turn.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
