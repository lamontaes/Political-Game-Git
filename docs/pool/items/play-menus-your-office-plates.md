---
id: play-menus-your-office-plates
title: "Your office sits on plates: the seat as fact plates, the budget lines as a paged plate, the open posts as cards, the draft card on its own plate"
area: play
lead: play-first
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: play-first/play-menus-your-office-plates
pr: #6913
blocked-on: "#6900 (the menu stack's shared parts: #6881, #6883, #6885, #6892, #6900)"
milestone: play-first
source: owner, Oct 29 ("So they're not blocks of text anymore with random buttons"; every menu like Government)
claimed-at: 2026-10-30T06:51:04.933Z
---

**What.** Politics → Your office is the last in-game menu still drawn as rows down the bare panel (`office()` → `seatRows()` and `officeRows()`): the seat's pay and next meeting as a list row, the head-pick selects and the budget editor as labeled rows, the draft card and the meeting panel below them. This item puts it on the shared parts like every other menu: the seat as fact plates (office, pay, next meeting), the budget lines as a paged plate, the open posts the player names as cards, and the draft card on its own plate, with the panel never scrolling as a page. The lane owns the draft card and the meeting panel, so the lane builds this screen.

**Rules.** Screen to mock: the shared kit parts from the menu stack (`ui/plate.mjs` plate, factPlates, chips, plateRow; `pager`; `listEntry`; `buttonTray`), never a one-off renderer. The draft card (#6843) and the meeting panel (#6830) keep their `.draft-*` and `.meeting-*` selectors. No hand-written player text: labels from the controls words. Replace, never layer: the old list rows are deleted.

**Done when.** In a drawn place at 1440 by 900, named with its seed, with the player holding a seat, a browser check opens Your office and finds the seat's fact plates, the budget lines on a plate and the draft card on its own plate, and fails if the sheet body scrolls; `bill-screens.browser.mjs` passes on the new layout; screenshots land in `docs/play-first/shots/play-menus-your-office-plates/`.

**Time box.** 2 hours, Sonnet (lane).

**You will see.** Your office as plates: your seat, your budget, the posts you name and your draft.

**Screenshot.** Your office before and after at 1440 by 900.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json, src/bench/bill-screens.browser.mjs

**Notes.** Filed by the CTO, Oct 30 04:10, at the lane's yes (the lane builder: no item or ORDER line existed; searched the pool, no match). The lane takes it after #6861 and #6879, once the stack has landed. Read: OWNER-DECISIONS Oct 29 22:45; prior-rulings/screens.md.
