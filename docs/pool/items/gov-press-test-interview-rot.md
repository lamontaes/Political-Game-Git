---
id: gov-press-test-interview-rot
title: "press.test.ts never-the-reporter-who-covers-their-own-interview fails on main: lifePlaceSearch is not imported, and with it imported no drawn town has a local paper whose reporter can file"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4685
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The press test that a paper never sends a candidate as their own reporter failed on main: it called a place search that was no longer imported, and with that fixed no drawn town had a local reporter who could file, because a rule from October 14 keeps press staff off the ballot while they work for an outlet. The case still arises when an outlet hires someone who has already filed. Repair the test so it reaches that case and keeps checking the guard.

**Rules.** Hand-inserted fixtures prove edge cases only: the test says so and does not claim a played-world result. One rule, all 56 places: the town is drawn from all 56 and the seed is named.

**Done when.** The press test file passes on a drawn place from all 56 with the seed named in the PR body, and the reporter-interview test puts a filed reporter on the ballot and shows the paper sends a different reporter, in src/core2/press.test.ts; no record id is hand-made beyond the one filing row.

**Files.** src/core2/press.test.ts

**Notes.** Found while building the press turnover work (Oct 16). Pre-existing failure on clean main.

Sent back 2026-10-16 from PR #4685 (branch claude/gov-press-test-interview-rot): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
