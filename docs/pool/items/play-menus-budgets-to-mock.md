---
id: play-menus-budgets-to-mock
title: "Budgets reads like the Oct 14 mock: the total large, where the money comes from and goes as rings, the books beside them"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: done
claimed-by: cto/menus-budgets
pr: #6881
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... So they're not blocks of text anymore with random buttons")
claimed-at: 2026-10-30T02:46:20.621Z
---

**What.** Politics → Budgets showed a government's year as a row of stat figures, then its revenue and spending as two long lists of horizontal bars, and names arrived as "County Of Gila" because the shared name helper capitalized small words when a whole name came in capitals. The owner asked for every menu to be redesigned like Government (Oct 29, 22:45), and the Oct 14 Budget mock shows the government's year and total in large type, where the money comes from and where it goes as rings with amounts, and a third plate beside them. This item draws Budgets that way from the budget records, keeps an executive's spending priorities with their step buttons, and makes the one name helper keep "of", "the" and "and" small.

**Rules.** Screen to mock: the screen follows `docs/ui/mocks/screens-2026-10-14/shots/budget.png` and the shared kit parts (plate, plate row, the one chart part), never a one-off renderer. One engine per mechanic: one helper writes a record's capitalized name (`properName`), and the duplicate `readable` is deleted. No hand-written player text: every label comes from the controls words and every amount is rounded.

**Done when.** In a drawn place at 1440 by 900, named with its seed, Budgets shows the government's year and total in large type, the revenue and spending as rings with each of the largest lines' amounts and the rest as Other, and the treasury's books, with every amount rounded and nothing scrolling; the words test proves "COUNTY OF CARBON" reads "County of Carbon"; screenshots beside the mock land in `docs/play-first/shots/play-menus-budgets-to-mock/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** A county's budget with its total in large type and two rings showing where its money comes from and where it goes.

**Screenshot.** Budgets at 1440 by 900 from a drawn place, beside the mock.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/chart.mjs, src/bench/ui/plate.mjs, src/bench/data/controls.json, src/director/words.ts, src/bench/government.ts, src/bench/government-bodies.ts, src/bench/budgets.browser.mjs

**Notes.** Filed by the CTO, Oct 30 03:25, the eighth screen of the menu redesign. Review: words (src/director/words.ts). Read: OWNER-DECISIONS Oct 29 22:45 and 23:00 (bars that count records are not the no-meter ruling); searched the pool: budget screen, properName (no twin).
