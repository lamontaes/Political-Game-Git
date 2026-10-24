---
id: play-first-08-news-box-fades-or-dismisses
title: "The news box fades on its own or goes with one click"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release the NEWS box sat top right over the scene from the first evening until opened. The owner's read: the news box fades or can be dismissed. The Oct 14 mock makes it a toast for a story that just reached you. This item makes the toast fade after a short time and close with one click, leaving the story in News.

**Rules.** This is a game, not a spreadsheet: the room is home and a toast never parks over it. Replace, never layer: the standing news box is replaced by the toast, not kept beside it.

**Done when.** In a drawn place on the first evening, the news toast fades within ten seconds untouched, a click on its close removes it at once, and the story is still in News, shown by a screenshot before and after.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
