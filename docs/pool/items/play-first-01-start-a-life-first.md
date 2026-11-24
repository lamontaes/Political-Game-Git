---
id: play-first-01-start-a-life-first
title: "New game puts Start a life first and combines the two world modes"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6232
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release New game opened Custom world, Start a life and New world with nothing saying which to pick. The owner's read of the screenshots: Start a life is the main one and goes first, and Custom world and New world are combined or explained. This item puts Start a life first and combines the two world modes into one choice, with the custom start kept where the Oct 14 ruling puts it (dev mode).

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the way into a life is the first thing a player sees. No hand-written player text: choice names are control names from data. Replace, never layer: the second world mode is removed, not hidden.

**Done when.** On the title in a drawn place's new game, New game shows Start a life first and one world choice, and a test fails if the menu offers two world modes, shown by a screenshot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** New game opens with Start a life as the first and largest choice, and one world choice beneath it that says what it does.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/title.ts, src/bench/play.html, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): New game listed CUSTOM WORLD, START A LIFE, NEW WORLD with START A LIFE second; owner: "I've already ruled about custom world, start a life, a new world. It should just say start a life or custom world or something like that." Not in v0.34.0 (#6091 sent back Oct 26 for custom world outside dev mode). Also seen, owner silent: a small "Customize the world" icon top right of the title (OD:215: no customization on the title itself); check it.

Sent back 2026-10-25 ~22:20 UTC from PR #6091 (branch play-first/play-first-01-start-a-life-first, head 78e82b2fc1 with main merged in): all three body screenshots are wrapped in backticks so none render as images, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tags and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6091 (branch play-first/play-first-01-start-a-life-first): Current-main integration and static gate pass, but ordinary New game Advanced Custom world opens setup with dev mode false, violating OWNER-DECISIONS.md36 and this item custom-dev requirement; route or restrict custom setup through dev mode and assert the boundary in title.browser.mjs; finish on that branch, merge main into it first.

Fixer 6 (Oct 27): no superseding PR. The work is on main (6bddea1c53, Advanced as the one dev-mode start); #6091 is left for the CTO to close.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (commit 6bddea1c53).
