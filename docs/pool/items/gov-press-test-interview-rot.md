---
id: gov-press-test-interview-rot
title: "press.test.ts never-the-reporter-who-covers-their-own-interview fails on main: lifePlaceSearch is not imported, and with it imported no drawn town has a local paper whose reporter can file"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4685
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** press.test.ts never-the-reporter-who-covers-their-own-interview fails on main: lifePlaceSearch is not imported, and with it imported no drawn town has a local paper whose reporter can file. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections. Finish it on the existing branch claude/gov-press-test-interview-rot, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/gov-press-test-interview-rot.md and the files that pull request #4685 changes on claude/gov-press-test-interview-rot

**Notes.** Found while building the press turnover work (Oct 16). Pre-existing failure on clean main.

Sent back 2026-10-16 from PR #4685 (branch claude/gov-press-test-interview-rot): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4685 (branch claude/gov-press-test-interview-rot): merging main conflicts in src/core2/press.test.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4685 (branch claude/gov-press-test-interview-rot): Merging current main into claude/gov-press-test-interview-rot conflicts in src/core2/press.test.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Checked Oct 16 (claude, claude/gov-press-test-interview-rot, after merging main): the failure no longer exists on main. The CTO's ruling of Oct 14 (SG-GOV-press-office-owner-confirmation) keeps press staff and owners off the ballot, and main's `src/core2/press.test.ts` now tests that rule ("is refused a filing while on an outlet's staff, so their paper never interviews its own reporter") instead of the old interview case, so the missing `lifePlaceSearch` import and the town with no reporter who can file are both gone. This branch's own test change was dropped in the merge in favor of main's. Nothing is left to build; the merger can mark the item done.
