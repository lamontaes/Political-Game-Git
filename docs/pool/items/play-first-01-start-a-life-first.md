---
id: play-first-01-start-a-life-first
title: "New game puts Start a life first and combines the two world modes"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: play-first/play-first-01-start-a-life-first
pr: #6091
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T19:16:43.285Z
---

**What.** On the v0.22.10 release New game opened Custom world, Start a life and New world with nothing saying which to pick. The owner's read of the screenshots: Start a life is the main one and goes first, and Custom world and New world are combined or explained. This item puts Start a life first and combines the two world modes into one choice, with the custom start kept where the Oct 14 ruling puts it (dev mode).

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the way into a life is the first thing a player sees. No hand-written player text: choice names are control names from data. Replace, never layer: the second world mode is removed, not hidden.

**Done when.** On the title in a drawn place's new game, New game shows Start a life first and one world choice, and a test fails if the menu offers two world modes, shown by a screenshot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** New game opens with Start a life as the first and largest choice, and one world choice beneath it that says what it does.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/title.ts, src/bench/play.html, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
