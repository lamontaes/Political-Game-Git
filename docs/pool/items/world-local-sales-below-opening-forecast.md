---
id: world-local-sales-below-opening-forecast
title: "Local-serving businesses sell 35 to 65 percent below the demand their opening staff was sized for, so every played town shrinks about 10 to 15 percent in its first year"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In the played year in Anon Raices, Puerto Rico (seed 1977d40995) the businesses that sell to residents take in far less than the demand their opening staff was sized for: retail sells 61 percent of its forecast, a professional office 53, construction 58, an information firm 36, while manufacturing and wholesale sell 95 to 99 percent. Employers staff from a blend of that forecast and their own receipts, so every town sheds 10 to 15 percent of its jobs in the first year (99 to 91 here, 310 to 265 in Hinton, West Virginia, and 37 to 33 in Buckeye, Iowa), layoffs and closures never reopen, and hires fall to about 1.3 percent a month against a band of 3.04 to 4.0. Find why household and counted-group spending reaches local sellers at about three quarters of the opening books' demand, and make the opening forecast and the spending agree.

**Rules.** Wire to the world and one model, two tiers: the spending of counted groups and full people comes from the same rule, and the demand a firm is sized for must be what its customers' own budgets reach. No dice and never tune a seed: change the cause, not the staffing step.

**Done when.** In the played world (`buildBenchWorld`) for Anon Raices, Puerto Rico (seed 1977d40995) and one other drawn place, a year's realized sales of each local-serving kind are within 10 percent of the demand its opening staff was sized for, employment ends the year within 5 percent of where it began, and the hires, quits and layoffs from `scripts/world-proofs/session-b-layoffs.ts` are inside their JOLTS bands with cash error zero.

**Files.** src/core2/business-books.ts, src/core2/modules/business.ts, src/core2/modules/residents.ts, src/core2/modules/jobs.ts

**Notes.** Found on world-hires-below-jolts. Measured per firm: sales per year against annualDemandMinor over the price ratio (retail 738,590 against 1,203,135; professional 554,148 against 1,046,735). Years two and three of the same world hire about 2.8 percent a month once firms have settled at the lower staffing, so the first-year hire shortfall is this gap closing, not a hiring rule. Ruled out: the first 11-day trading window (weighting it by length changed hires from 14 to 16) and a missing replacement path (every leaver of a firm that wants staff is replaced).
