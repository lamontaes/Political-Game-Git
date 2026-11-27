---
id: play-loading-year-card-heading-over-other-years
title: "The loading story's year card is headed with the start year over lines from many earlier years"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Owner's Nov 23 sitting, row C1 (docs/coordination/playtest/2026-11-23-1.md, PR #10292)"
checked:
claimed-at:
---

**What.** While a new world loads, the year card is headed with a year (2016 in the sitting, 2025 in my run) over a list of lines dated years earlier, because the last frame is the start year even with nothing to tell. The player reads a heading that contradicts the lines under it. Seen: the loading screen after New game, before the opening talk.

**Cause.** Found in code: the function playLoadingStory (line 7639) in src/bench/play.mjs set the heading to the last frame's year, and loadingStory in src/bench/loading.ts always makes the last frame the start year even with nothing to tell. Measured: a new world in a drawn place on main 7f04c334: heading 2025 over lines from 2016 to 2021.

**Fix.** Drop a year with nothing to tell from the frames, so the heading ends on the newest year that has lines. The rolling journal (the loading check's "oldest lines go off the top by design") stays.

**Time box.** 1 hour.

**Rules.** No hand-written player text in code: no line is reworded, and only which year the heading names changes, from the records the story already reads.

**Done when.** A second session starts a new life in a drawn place on main, lets the loading story run in the screenshot, and sees the heading end on the newest year that has a line under it, never the start year over older lines, with the year counter still moving.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs
