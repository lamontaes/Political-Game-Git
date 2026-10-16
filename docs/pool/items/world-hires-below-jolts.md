---
id: world-hires-below-jolts
title: "Hiring runs 59% below the JOLTS band in a played year (Anon Raices, Puerto Rico: 1.24% a month against 3.04 to 4.0)"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/hires-jolts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T05:20:38.061Z
---

**What.** In the played year in Anon Raices, Puerto Rico (seed 1977d40995, January 20, 2025 to January 20, 2026) businesses hired 15 times over 1,212 employed person-months, 1.24% a month, where the JOLTS band is 3.04% to 4.0%. Quits (1.57%) and layoffs (1.40%) are inside their bands, so employment falls from 99 to 89. A position opens only when someone leaves or the employer is under its target, so layoffs and closures never reopen and 15 hires replace only 25 of the quits, retirements and deaths, while 93 jobseekers wait with no open position. Find what limits openings (`need` and the gap in `src/core2/modules/jobs.ts`) and what a growing or recovering firm should read to open more.

**Rules.** No dice: openings come from a firm's own sales, costs, staff and what the region's labor market gives it; real rates check totals only. Never tune a seed.

**Done when.** The same Anon Raices year (`npx tsx scripts/world-proofs/session-b-layoffs.ts 1977d40995`) and one other drawn place show hires inside 3.04% to 4.0% a month with quits and layoffs still inside their bands, every job change with a reason and decider and cash error zero; each opening cites the firm record that caused it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts, scripts/world-proofs/session-b-layoffs.ts

**Notes.** Found finishing world-layoffs-proof (PR #4591).

**Findings (Oct 16, claude/hires-jolts).** The proof (`scripts/world-proofs/session-b-layoffs.ts`, one year each, about 30 seconds) on the notes' seed and four places drawn at random, with hires, quits and layoffs as a share of employed person-months a month against the JOLTS bands (hires 3.04 to 4.0, quits 1.4 to 2.3, layoffs 1.2 to 1.7):

| place                          | seed       | hires | quits | layoffs | employed, first to last month |
| ------------------------------ | ---------- | ----- | ----- | ------- | ----------------------------- |
| Anon Raices, Puerto Rico       | 1977d40995 | 1.31  | 0.90  | 1.23    | 99 to 90                      |
| Pinch, West Virginia           | 7b819f6077 | 4.07  | 3.14  | 0.32    | 589 to 579                    |
| Center Sandwich, New Hampshire | 6ad286e790 | 0.31  | 1.08  | 1.55    | 56 to 46                      |
| Maysville, Missouri            | d0117c6930 | 1.10  | 1.69  | 1.06    | 244 to 187                    |
| Pistol River, Oregon           | e1252a4b6f | 1.83  | 2.27  | 1.37    | 2,175 to 1,579                |

So it is not one place: in four of five, hires are well below the band and employment falls 2 to 27 percent in the year. In Pistol River 408 hires replaced 570 quits and retirements while 297 layoffs and 9 closures were never replaced. No position stands open at the end in any place, and 92 to 605 jobseekers wait. A firm replaces a leaver only while its staff is below its target (`need` and `gap` in `reviewEmployers`), so a fall in targets, not a missing opening rule, is what holds hiring down. The next step is to read why the targets fall (the projected staff and `salesStaff` in `reviewEmployers`): whether the town's sales shrink as jobs are lost, a spiral that real towns do not show, and to fix that cause. The 15 hires versus 25 leavers in the first place is the same pattern.

**Second finding (Oct 16).** In Pistol River, Oregon (seed e1252a4b6f), the sales-implied staffing of the 32 to 34 employers (`salesStaff` in the jobs employers table) falls month by month from 2,176 to 1,525 across the year, the same 30 percent as employment, while the summed fractional `need` stays positive (35 to 73) and jobseekers wait. So firms do open positions and fill them at once; they want fewer workers each month because their sales fall. The fall in sales is the cause to chase: a loop in which lost jobs cut household spending, which cuts sales and staffing in turn, in a year that has no recession in its macro inputs. Check household spending against income by month, and whether benefits and savings cushion it as they do in real towns.
