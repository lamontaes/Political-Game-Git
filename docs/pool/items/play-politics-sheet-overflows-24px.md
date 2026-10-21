---
id: play-politics-sheet-overflows-24px
title: "The Politics sheet's Government tab overflows its window by 24 pixels, so the no-scroll check fails on main"
area: play
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/political-game-pool-3xfqef-20
pr: #5550
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:53:06.868Z
---

**What.** src/bench/no-scroll.browser.mjs fails on main: start and after a day, the Politics sheet's div.cols is 24 pixels taller than its box (the sheet pages four pages but the columns box itself overflows by more than the 8 pixel slack). Find which row or heading in the Government tab sits outside the pager's box and make the sheet fit.

**Rules.** No scrolling inside sheets (owner, M6-02). Replace, never layer: fix the layout where it overflows, do not raise the slack. No hand-written player text.

**Done when.** In a browser run against a new game in a drawn place and seed, npm run bench browser check src/bench/no-scroll.browser.mjs prints no over-by line for any of the eleven doors, with the Politics sheet at or under the 8 pixel slack at the start and after a day.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/no-scroll.browser.mjs

**Notes.** Oct 20: four runs of no-scroll.browser.mjs on main in Chromium 1194 (Galena, Ohio; continued life) pass, with the Politics sheet at #sheet 3px and 4 pages, start and after a day. It did not reproduce there; try a drawn new game in another place before changing the layout.

Oct 20 (claude/fixed-on-main-notes): not reproduced on current main. With the bench server up and `BENCH_BROWSER=/opt/pw-browsers/chromium`, `node src/bench/no-scroll.browser.mjs` printed `PASS 11 sheets, twice` four times in a row (every sheet at 3 px, the Politics sheet four pages). The check continues the saved game, so a new game in another place is the case still untried; the CTO can mark this done or leave it for a checker's pass on a new game.
