---
id: title-screen-national-scene-regression
title: "The title shows the monuments on main in their light; conventions and rallies out"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: lane-4/title-monuments
pr: #7213
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T08:33:35.321Z
---

**What.** Rewritten by Lane 4 on Nov 4, as `docs/lanes/lane-4.md` directs (title card, unit 6): the title rotated through conventions, rallies, chamber floors, a debate stage and the Oval Office beside two monuments. The owner's Oct 29 monument ruling (`OWNER-DECISIONS.md`: "menu screens show DC monuments, not conventions, with the latest character in front and passersby") and the lane's path 1 want monuments only, in varied light.

**Rules.** The art on main only tonight (owner, Nov 4): the U.S. Capitol (morning, midday, night, rain), the White House (midday) and the Lincoln Memorial (night). No Washington or Jefferson paintings, no person on the title until the people system lands. Replace, never layer.

**Done when.** Every title frame is a monument on main in one of its painted lights, never a convention, rally or room; no monument shows twice in a row; the picture fills the window under the menu at 1440x900, 1280x800 and 1024x768 (`src/bench/title-monuments.browser.mjs`), with screenshots naming monument and light.

**Files.** src/bench/title.ts, src/bench/title.test.ts, src/bench/title-monuments.browser.mjs

**Notes.** The character in front and passersby wait on the people system (path 1 gap, in `docs/lanes/state/lane-4.md`). Old note: the Oct 27 look-first audit found the original failing assertion already gone.
