---
id: world-hires-below-jolts
title: "Hiring runs 59% below the JOLTS band in a played year (Anon Raices, Puerto Rico: 1.24% a month against 3.04 to 4.0)"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/world-hires-below-jolts
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T11:05:27.148Z
---

**What.** In the played year in Anon Raices, Puerto Rico (seed 1977d40995, January 20, 2025 to January 20, 2026) businesses hired 15 times over 1,212 employed person-months, 1.24% a month, where the JOLTS band is 3.04% to 4.0%. Quits (1.57%) and layoffs (1.40%) are inside their bands, so employment falls from 99 to 89. A position opens only when someone leaves or the employer is under its target, so layoffs and closures never reopen and 15 hires replace only 25 of the quits, retirements and deaths, while 93 jobseekers wait with no open position. Find what limits openings (`need` and the gap in `src/core2/modules/jobs.ts`) and what a growing or recovering firm should read to open more.

**Rules.** No dice: openings come from a firm's own sales, costs, staff and what the region's labor market gives it; real rates check totals only. Never tune a seed.

**Done when.** The same Anon Raices year (`npx tsx scripts/world-proofs/session-b-layoffs.ts 1977d40995`) and one other drawn place show hires inside 3.04% to 4.0% a month with quits and layoffs still inside their bands, every job change with a reason and decider and cash error zero; each opening cites the firm record that caused it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts, scripts/world-proofs/session-b-layoffs.ts

**Notes.** Found finishing world-layoffs-proof (PR #4591).

Looked at 2026-10-16 (claude session), reproduced: `npx tsx scripts/world-proofs/session-b-layoffs.ts 1977d40995` (Anon Raices, Puerto Rico, place 7203174) gives hires 1.08% a month (13), quits 0.67% (8) and layoffs 1.33% (16), the first two outside their JOLTS bands, with 99 jobseekers and no open position at the end. Not built: the cause is not a limit on openings. `jobs.ts` opens a position when a worker leaves (need grows by one at once) or when a firm's target staff exceeds its staff plus postings (need grows by `jobsStaffGapActedPerMonth` of the gap), and both work; but every firm's target is its own opening staff scaled by its own sales, and no firm's sales ever grow at another's expense. So a firm that lays off never re-hires (its target fell), and no firm hires to grow, while real churn is firms growing and shrinking against each other: separations of 3.3% a month are matched by hires of 3.6%. Raising hires into the band without that would be tuning a seed. It needs `world-customers-move-between-sellers` first (customers move between sellers month by month, so shrinking firms lay off and growing ones hire); `world-local-sales-below-opening-forecast` also sets targets too low. Re-run this proof after those two land.
