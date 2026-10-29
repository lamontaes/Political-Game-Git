---
id: screens-creator-look-stage-fits-900
title: "The creator's appearance stage fits a 900px window"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The creator's appearance stage (cr-look) is 920 to 943 px tall at 1440x900 on main: the title, the 260px figure preview, ten appearance rows of 40 to 42 px, Randomize, and two rows of actions, so Back and Begin sit under the window's edge and the panel runs off the screen. A look with a wrapped row (Short beard and mustache) is taller still. The owner's rule is no scrolling inside a menu and panels fit the window.

**Rules.** screen-to-mock: panels fit the window and use their space; kit13 APPROVED: no scrolling inside a menu; the one UI package ruling (OWNER-DECISIONS Oct 28 02:00) means the fix is in the creator's rows or the panel's layout, never a second creator.

**Done when.** In the bench at 1440x900, from New game to Start a life to a drawn place, the appearance stage's panel top is at or below 0 and its bottom at or above the window's edge for a male and a female look drawn by seed, shown in a screenshot in docs/play-first/shots with the place and seed, and src/bench/creator-random-place.browser.mjs or a sibling check asserts the fit.

**Files.** src/bench/play.html,src/bench/play.css,src/bench/play.mjs

**Notes.** lead: play-first. Found by the screens session on Oct 28 while adding the Random place line (PR #6666), which pays for its own height by shrinking the preview to 200px.
