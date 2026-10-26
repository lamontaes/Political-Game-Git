---
id: play-first-08-news-box-fades-or-dismisses
title: "The news box fades on its own or goes with one click"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6100
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release the NEWS box sat top right over the scene from the first evening until opened. The owner's read: the news box fades or can be dismissed. The Oct 14 mock makes it a toast for a story that just reached you. This item makes the toast fade after a short time and close with one click, leaving the story in News.

**Rules.** Serves LAW.md §6, News; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the room is home and a toast never parks over it. Replace, never layer: the standing news box is replaced by the toast, not kept beside it.

**Done when.** In a drawn place on the first evening, the news toast fades within ten seconds untouched, a click on its close removes it at once, and the story is still in News, shown by a screenshot before and after.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The news toast top right fades after a few seconds or goes with one click, and never stays over the room.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): News toast (top right) never left; the Journal toast (bottom right, "I ran for Council member.") sat from Jan 22 into May. Owner: "there's no way to get rid of it and it doesn't leave for any reason. Same thing with a journal on the bottom right." Extend the item's done-when to the Journal toast.
