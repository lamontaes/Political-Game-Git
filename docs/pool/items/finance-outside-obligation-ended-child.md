---
id: finance-outside-obligation-ended-child
title: "Finance day throws 'Outside obligation refers to missing, inactive or unmatched recipient terms' on a pooled retirement obligation in a world with convictions"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4734
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Finance day throws 'Outside obligation refers to missing, inactive or unmatched recipient terms' on a pooled retirement obligation in a world with convictions. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/outside-obligation-ended-child, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/finance-outside-obligation-ended-child.md and the files that pull request #4734 changes on claude/outside-obligation-ended-child

**Notes.** Found by the prison-voting test (pool item gov-needs-opus-gov-209) while 40 sitting officials were offered large bribes and the justice engine sentenced several. It stopped one world in six or so on the first run, 37 seconds in, and not on two later runs; the seed was not kept. Whether the convictions matter is not shown: a sentenced person's jobs end, and a retirement child could end the same way. The test now skips a world that stops on it and names its seed in the failure message if no world gets through.

Sent back 2026-10-16 from PR #4734 (branch claude/outside-obligation-ended-child): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4734 (branch claude/outside-obligation-ended-child): Merging current main into claude/outside-obligation-ended-child conflicts in src/core2/finance-state.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4734 (branch claude/outside-obligation-ended-child): merging main conflicts in src/core2/finance-state.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
