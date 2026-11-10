---
id: play-guide-sheet-scrolls
title: "The Guide sheet is 611 pixels taller than its window, so it scrolls"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: play-first
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** The title says the Guide sheet is 611 pixels taller than its window, so it scrolls, which no menu sheet is meant to do. The item body was never filled in (released from an idle draft), and no measurement was kept: not the window size, the place or the screen state the 611 pixels were read in. The Guide screen is built in src/bench/ui/guide-screen.mjs with its labels in src/bench/data/controls.json. Seen: the Guide sheet, which now overruns its window and scrolls.

**Cause.** Needs cause. Looked at src/bench/ui/guide-screen.mjs and the guide controls in src/bench/data/controls.json (line 943) and found no stated or measured scroll defect beyond the title's 611 pixels; nobody has re-measured it on current main.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one Sonnet session, to measure the Guide sheet at 1440 by 900 in a drawn place and either rewrite this item with `Found in code:` and a real Fix or propose it for dropping.

**Rules.** Screen to mock: the Guide fits its window like every menu sheet, from the shared controls. Replace, never layer: a fix changes the one Guide sheet, with no second layout beside it.

**Done when.** A second session opens the Guide in a drawn place (named with its seed) at 1440 by 900 and records, with a screenshot, whether the sheet scrolls and by how many pixels; if it does, this item is rewritten with the cause found by file and line, and if it does not, the item is proposed for dropping with the screenshot.

**Waits on.** Nothing.

**Files.** src/bench/ui/guide-screen.mjs, src/bench/data/controls.json, src/bench/play.css

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.
