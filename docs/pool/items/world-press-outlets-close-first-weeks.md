---
id: world-press-outlets-close-first-weeks
title: "A town's paper or station closed within weeks of the opening and its reporters were laid off"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #4988
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A local paper or station opened with no cash, so the gap between its first payday and its first month's sales closed it. In Pony, Montana (the path-check run, seed `pcA1`) the newspaper closed on 2025-02-17, four weeks in, cause `finance.unfunded-obligation-cash-and-credit-exhausted`: sales $8,283 against wages $10,055, and its two staff were laid off. In a play year of five drawn places (seeds `pq1` to `pq5` for "pclose") two lost outlets: Gothenburg, Nebraska (a station on 2025-05-05) and Fort Defiance, Arizona (three on 2026-01-05). A town then has stations without reporters, so the press prints less and the golden path's step 10 (people bring a law up) is missed. The fix: when an outlet joins the jobs engine it receives the cash buffer an ordinary small business holds, 27 days of its outflows (JPMorgan Chase Institute 2015), from the outside account, by the conserving transfer officials' savings use.

**Rules.** One rule, all 56 places: the buffer is sized from each outlet's own payroll, with no place named. An effect is a read, not a record: the cash is what the outlet's payroll draws on at its next payday. Every dollar balances, and the buffer is a SOURCED parameter with its spread; the funding is covered by the open stopgap `SG-PEOPLE-press-outlet-revenue`, whose text now names it.

**Done when.** In the five places above (seeds `pq1` to `pq5`, purpose "pclose", a year) closures of press outlets fall from 4 to 1, and `src/core2/press-working-capital.test.ts` fails without the buffer in Gothenburg and passes with it. The owner plays it: his town keeps its paper and stations through the first year.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json

**Notes.** Remaining closure: see `world-press-outlet-revenue-wage-gap`.

Correction in PR 5094: the existing opening buffer from 4999 and the schedule fix in 5013 already address this closure cause. Remove the additional enrollment payment added by 4988; keep this item done and leave gov-press-outlet-revenue open for the deeper revenue work.
