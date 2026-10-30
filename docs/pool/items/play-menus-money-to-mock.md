---
id: play-menus-money-to-mock
title: "Money reads like the Oct 14 mock: the cash large, each month as a column, where the month went as a ring"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: done
claimed-by: cto/menus-money
pr: #6855
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... So they're not blocks of text anymore with random buttons")
claimed-at: 2026-10-30T02:02:01.323Z
---

**What.** The Money screen today is one plate holding the cash amount on an otherwise empty panel, with the months, spending, home, assets and debts as lines of label and amount. The owner asked for every menu to be redesigned like Government (Oct 29, 22:45), and the Oct 14 Money mock shows a big cash figure, six months of balances as columns, a ring of where the month went, and what you own and owe as cards. This item draws Money that way from the bank's, the ledger's and the housing engine's records, on framed plates, with nothing scrolling.

**Rules.** Screen to mock: the screen follows `docs/ui/mocks/screens-2026-10-14/shots/money.png` and the shared kit parts (plate, fact plates, one chart style), never a one-off renderer. No hand-written player text: every label comes from the controls words and every figure from a record, rounded for reading. Replace, never layer: the old line-list Money screen is deleted.

**Done when.** In a drawn place played into its third month at 1440 by 900, named with its seed, Money shows the cash in large type, one column per month the credit engine reviewed, the household's last month as a ring with each reason's share, the home with its worth or rent, and what is owned and owed as plates, all read from `/api/bank` records, with no figure contradicting another and nothing scrolling; screenshots beside the mock land in `docs/play-first/shots/play-menus-money/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** Money with your cash in large type, columns for each month, and a ring showing where last month went.

**Screenshot.** Money before and after at 1440 by 900 from a drawn place, beside the mock.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/chart.mjs, src/bench/data/controls.json

**Notes.** Filed by the CTO, Oct 30 02:20, the third screen of the menu redesign. Read: OWNER-DECISIONS Oct 29 22:45 and 23:00 (bars that count records are not the no-meter ruling); searched the pool: money screen, bank (no twin).
