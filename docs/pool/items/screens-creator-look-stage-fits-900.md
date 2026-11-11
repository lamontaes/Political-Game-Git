---
id: screens-creator-look-stage-fits-900
title: "The creator's appearance stage fits a 900px window"
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-screens-creator-look-stage-fits-900
pr: #8601
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: design-screen-principles
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:08:04.169Z
---

**What.** The creator's appearance stage (cr-look) is 920 to 943 px tall at 1440x900 on main: the title, the 260px figure preview, ten appearance rows of 40 to 42 px, Randomize, and two rows of actions, so Back and Begin sit under the window's edge and the panel runs off the screen. A look with a wrapped row (Short beard and mustache) is taller still. The owner's rule is no scrolling inside a menu and panels fit the window. This is a layout defect, not a full-body staging one, so the Nov 10 ruling that staging waits for busts does not cover it.

**Cause.** Measured: the bench at 1440x900 from New game to Start a life, with the look drawn by seed; the panel cr-look (src/bench/play.html line 408) is 920 to 943 px tall (ten rows, 260 px preview, two action rows) per the item, found by the screens session on Oct 28 while adding the Random place line.

**Fix.** Reflow or shrink the appearance stage's rows and preview in src/bench/play.css so the panel's top and bottom sit inside the window for a male and a female look, and assert the fit in src/bench/creator-random-place.browser.mjs or a sibling check. The fix is in the creator's rows or the panel's layout, never a second creator.

**Time box.** 2 hours.

**Rules.** Screen-to-mock: panels fit the window and use their space; kit13 APPROVED: no scrolling inside a menu; the one UI package ruling (docs/coordination/OWNER-DECISIONS.md, Oct 28 02:00) means the fix is in the creator's rows or the panel's layout, never a second creator. One rule, all 56 places: the look is drawn by seed in a drawn place.

**Done when.** A second session, in the bench at 1440x900, goes from New game to Start a life to a drawn place and sees the appearance stage's panel top at or below 0 and its bottom at or above the window's edge for a male and a female look drawn by seed. A screenshot in docs/play-first/shots shows it with the place and seed, and a browser check in src/bench asserts the fit.

**Waits on.** Nothing.

**Files.** src/bench/play.html, src/bench/play.css, src/bench/play.mjs, src/bench/creator-random-place.browser.mjs

**Notes.** lead: play-first. Found by the screens session on Oct 28 while adding the Random place line (PR #6666), which pays for its own height by shrinking the preview to 200px.
