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
claimed-at: 2026-10-16T08:32:11.378Z
---

**What.** In the played year in Anon Raices, Puerto Rico (seed 1977d40995, January 20, 2025 to January 20, 2026) businesses hired 15 times over 1,212 employed person-months, 1.24% a month, where the JOLTS band is 3.04% to 4.0%. Quits (1.57%) and layoffs (1.40%) are inside their bands, so employment falls from 99 to 89. A position opens only when someone leaves or the employer is under its target, so layoffs and closures never reopen and 15 hires replace only 25 of the quits, retirements and deaths, while 93 jobseekers wait with no open position. Find what limits openings (`need` and the gap in `src/core2/modules/jobs.ts`) and what a growing or recovering firm should read to open more.

**Rules.** No dice: openings come from a firm's own sales, costs, staff and what the region's labor market gives it; real rates check totals only. Never tune a seed.

**Done when.** The same Anon Raices year (`npx tsx scripts/world-proofs/session-b-layoffs.ts 1977d40995`) and one other drawn place show hires inside 3.04% to 4.0% a month with quits and layoffs still inside their bands, every job change with a reason and decider and cash error zero; each opening cites the firm record that caused it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts, scripts/world-proofs/session-b-layoffs.ts

**Notes.** Found finishing world-layoffs-proof (PR #4591).
