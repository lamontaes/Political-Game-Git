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

**What.** The title says the Guide sheet is 611 pixels taller than its window, so it scrolls, which no menu sheet is meant to do. The item body was never filled in (released from an idle draft), and no measurement was kept: not the window size, the place or the screen state the 611 pixels were read in. The Guide screen is built in src/bench/ui/guide-screen.mjs with its labels in src/bench/data/controls.json.

**Cause.** Found in code: two causes, one at each window size, both in the room the Guide gives its two columns. 1. At 1440x900 (Palmdale, Pennsylvania, a bench life on main 8c980a59) the sheet fits, at 900 of 900 pixels, but the word list scrolls around its own list box. `guideScreen` in src/bench/ui/guide-screen.mjs (line 87) asks the pager for `min(14, floor((viewHeight() - 330) / 36))` rows, 14 at 900 pixels, a box 502 pixels tall. Its parent `nav.pick-list.guide-roster` is capped at 46% of the window by `.pick-list` (src/bench/play.css line 2845, `max-height: calc(var(--vh) * 0.46)`, `overflow-y: auto`), 414 pixels. That gives two scrolls nested, against the one-box rule in src/bench/ui/pager.mjs (owner, Nov 8). `fitPagersNow` (src/bench/play.mjs line 5348), which takes rows away from a pager that does not fit, looks only at `.split-side`, `.split-main` and `#sheet-body` (line 5358), so it never sees the `.pick-list` overflow. 2. At 1024x768 (Libertyville, Indiana, a bench life on the same main), the chosen word's article is 611 pixels tall, and its Related buttons are cut off at the sheet's foot (screenshot below). `.guide-article.strip-screen` (play.css line 4035) has no height of its own. `fitPagersNow` sees `#sheet-body` overflow and takes rows from the word list until it shows one word, which does not help, because the overflow is the article's.

**Fix.** In src/bench/play.css give `.guide-article.strip-screen` the room left beside the list, the same bound the list has (`max-height` set in the same `--vh` terms as `.pick-list`), with `overflow-y: auto`. A long article then scrolls inside its own box, the way the owner's Nov 8 rule lets one long box scroll, and the sheet never does. In src/bench/play.mjs `fitPagersNow` (line 5358), add `.pick-list` to the parts a pager is fitted to (`box.closest(".split-side, .split-main, .pick-list")`). Then the Guide's list, and the People and Travel lists that use the same `nav.pick-list` (src/bench/ui/roster-screen.mjs line 25), shrink to their box instead of scrolling around it. Remove the fixed guess in guide-screen.mjs line 87 only if the fitter alone gets the row count right; otherwise keep it as the starting count.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screen to mock: the Guide fits its window like every menu sheet, from the shared controls. Replace, never layer: a fix changes the one Guide sheet, with no second layout beside it.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), opens the Guide at 1440x900 and at 1024x768, and records with screenshots: at each size the sheet does not scroll, the word list shows as many words as fit with no scroll around its box, and a long article (Adjournment) shows its Related buttons whole, scrolling inside the article if it must. The same session opens People and sees the list fill its box without a scroll around it.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/ui/guide-screen.mjs, src/bench/ui/roster-screen.mjs

**Notes.** TODO Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

Cause found (Nov 11, 2026, cause finder for Fable B): measured on bench lives in Palmdale, Pennsylvania (1440x900) and Libertyville, Indiana (1024x768) with a Playwright script that read each box's scrollHeight against its clientHeight. The sheet itself fits at 1440x900. The scroll is the word list's frame around its pager, and at 1024x768 the article runs past the sheet's foot. Screenshots: guide-palmdale-1440x900.png and guide-libertyville-1024x768.png, in this session's scratch folder.
