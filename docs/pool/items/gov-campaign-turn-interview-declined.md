---
id: gov-campaign-turn-interview-declined
title: "campaign-turn.test.ts fails on main: a reporter's interview is declined where the test expects an invitation (Admire, Kansas)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4753
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-16 from PR #4742 (branch claude/pool-reporter-interview): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4751 (branch claude/gov-campaign-turn-interview): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4753 (branch claude/campaign-turn-interview): campaign-turn.test.ts adds if (!row) return when no local outlet invites, bypassing answerInterview and the existing assertion that questions change once answered. The PR body acknowledges this weaker ending. Keep the decline edge case separately and ensure the original fixture reaches an invitation and the changed-question assertions; the merger morning check forbids skipped or weakened tests. The same correction applies to sibling PR #4751; finish on that branch, merge main into it first.
