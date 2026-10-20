---
id: world-hires-below-jolts
title: "Hiring runs 59% below the JOLTS band in a played year (Anon Raices, Puerto Rico: 1.24% a month against 3.04 to 4.0)"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-customers-move-between-sellers
source: added with npm run pool -- add
claimed-at:
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

**Third finding (Oct 16).** The business trading months in Pistol River, Oregon (seed e1252a4b6f) show sales per day roughly flat across the year (about $12,000 to $15,000 a day summed over 32 firms, from March on), while payroll per day falls from about $1,745 to $1,397 and costs per day sit at about $11,600 to $13,000, close to sales. Payroll is only about 12 percent of costs; the rest is operating, outside and compliance costs. So the firms run at near-zero margin, about half of them are in loss months in the proof's trading summary (152 of 434 trading months in the first place), and a loss pushes a firm's staffing toward what it can afford (`affordableStaff` and `lossPressure` in `reviewEmployers`). Hiring is low because the firms are not profitable at the opening, not because openings are blocked. The cause to chase is the opening margins (operating and outside costs against sales) in the business books, which is a calibration item in `world-money-calibration-sources`, and then re-run this proof.

**Root cause (Oct 16).** The near-zero margins and the falling sales-implied staffing above are the opening's, not hiring's: the item `world-local-sales-below-opening-forecast` traced them to books whose demand the opening has no named buyers for (retail 56 percent covered, professional 52, construction 58, information 36), so local-serving firms sell 35 to 65 percent below the demand their staff was sized for and every town shrinks 10 to 15 percent in its first year. This item closes when that one does; re-run the five-place proof above afterwards. A per-firm check in Pistol River, Oregon (seed e1252a4b6f) agrees: retail sold $3.0 million of $6.7 million demand, restaurants $1.3 to $1.8 million of $2.4 to $3.3 million, while manufacturing, inns and farms sold 92 to 100 percent of theirs.

Sent back 2026-10-16 from PR #4716 (branch claude/world-hires-below-jolts): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4716 (branch claude/world-hires-below-jolts): Merging current main into claude/world-hires-below-jolts conflicts in docs/pool/items/world-hires-below-jolts.md, docs/release/changes/world-hires-below-jolts.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

Looked at 2026-10-16 (claude session), reproduced: `npx tsx scripts/world-proofs/session-b-layoffs.ts 1977d40995` (Anon Raices, Puerto Rico, place 7203174) gives hires 1.08% a month (13), quits 0.67% (8) and layoffs 1.33% (16), the first two outside their JOLTS bands, with 99 jobseekers and no open position at the end. Not built: the cause is not a limit on openings. `jobs.ts` opens a position when a worker leaves (need grows by one at once) or when a firm's target staff exceeds its staff plus postings (need grows by `jobsStaffGapActedPerMonth` of the gap), and both work; but every firm's target is its own opening staff scaled by its own sales, and no firm's sales ever grow at another's expense. So a firm that lays off never re-hires (its target fell), and no firm hires to grow, while real churn is firms growing and shrinking against each other: separations of 3.3% a month are matched by hires of 3.6%. Raising hires into the band without that would be tuning a seed. It needs `world-customers-move-between-sellers` first (customers move between sellers month by month, so shrinking firms lay off and growing ones hire); `world-local-sales-below-opening-forecast` also sets targets too low. Re-run this proof after those two land.

Tried Oct 17 (claude, built, measured, not shipped): staff follows each firm's own sales instead of the books' capacity. In `reviewEmployers` the observed staff was `openingStaff x sales per day / (capacity x price ratio)`, so a firm whose opening buyers cover only part of its book demand reads as shrinking from its first month. I replaced the capacity with the firm's own first trading month (`salesPerDay` kept as an anchor on the employer row), so staff follows the firm's sales against its own baseline. One-year runs of `scripts/world-proofs/session-b-layoffs.ts` against the main baseline: Pistol River, Oregon (seed e1252a4b6f) employment 2,175 to 1,758 against 2,175 to 1,517, hires 4.33% a month against 2.04%, quits 3.60% against 2.68%, layoffs 1.76% against 1.56%; Maysville, Missouri (d0117c6930) 245 to 216 (was 244 to 187 in the Oct 16 table), hires 4.00% (inside the band), quits 3.27%, layoffs 1.14%; Center Sandwich, New Hampshire (6ad286e790) 56 to 47, hires 1.10%, quits 1.57%, layoffs 1.42%; Pinch, West Virginia (7b819f6077) grew 589 to 653 with hires 8.96% and quits 7.30%, layoffs 0.27%. So employment falls about a third less and hiring rises toward its band, but a single month's sales is a noisy baseline: quits and hires double where sales swing (Pinch) and quits leave their band in four of four places. The anchor needs a smoothed baseline (and a reason for the smoothing length from the sales data's own seasonality), and the remaining decline comes from the loss pressure on near-zero opening margins (`affordableStaff`), which still needs `world-local-sales-below-opening-forecast`. Nothing is left on a branch.

Oct 17 (claude): merged main into claude/world-hires-below-jolts with no conflicts; the branch now differs from main in nothing (its note and declaration are already on main), so PR #4716 carries no change. The CTO may close it. The item itself stays open on world-customers-move-between-sellers.

Measured Oct 20 (claude/political-game-pool-3xfqef-5), the same proof on main and on PR #5203's leaver-refill fix (`reviewEmployers` owes a leaver's job when the firm is short of staff, which a stale negative `need` had swallowed): Anon Raices, Puerto Rico (place 7203174, seed 1977d40995) hires 18 (1.42% a month) on main against 26 (2.04%) with the fix; Pistol River, Oregon (place 4158050, seed e1252a4b6f) 446 (2.03%) against 453 (2.06%). Both stay under the 3.04% floor; no position stands open at the end in either, cash error zero. So the fix recovers hires where firms were short and leaves the bulk of the gap to the item's root cause (targets set by sales, `world-customers-move-between-sellers`, `world-local-sales-below-opening-forecast`). Re-run after those two land.

Oct 20: PR #4716 carried findings only, so its number is cleared; the item stays blocked on world-customers-move-between-sellers.

Oct 20: Switched from blocked to the automatic after: gate on world-customers-move-between-sellers, so it opens by itself the moment those items are done.
