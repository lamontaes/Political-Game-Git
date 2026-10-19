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

**What.** A stance held by someone in the player's circle keeps every cause it has ever had, 2,850 of them after three years in one town, and each new cause copies the whole list. Keep the causes that still decide the stance, and cut the copying so adding a cause costs a constant amount. The stance's reasons for the player and the people they deal with must still be answerable.

**Rules.** Speed: a year must not run slower for this, and no change copies a whole history each time. Ask why: a stance keeps the reasons that still hold it, by record id.

**Done when.** In a three-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, a circle stance holds a bounded number of causes (shown by count), a stance's why is still answerable by cause record id, and views tests in src/core2/views.test.ts pass.

**Files.** src/core2/modules/views.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.

Sent back 2026-10-19 from PR #5062 (branch claude/stance-causes-bounded): Morning check and Oct 19 audit: the change keeps a fixed latest-24-cause cap for core-stance-causes-grow-without-limit. The audit explicitly sends #5062 back over this locked number; replace the cap with retention derived from the actual records and their consumers, without an arbitrary fixed history length; finish on that branch, merge main into it first.
