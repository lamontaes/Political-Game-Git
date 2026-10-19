---
id: core-stance-causes-grow-without-limit
title: "A stance in the player's circle keeps every cause, 2,850 of them after three years in one town, and each new cause copies the list"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5062
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-19 from PR #5062 (branch claude/stance-causes-bounded): Morning check and Oct 19 audit: the change keeps a fixed latest-24-cause cap for core-stance-causes-grow-without-limit. The audit explicitly sends #5062 back over this locked number; replace the cap with retention derived from the actual records and their consumers, without an arbitrary fixed history length; finish on that branch, merge main into it first.
