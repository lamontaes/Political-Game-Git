---
id: world-small-town-openings-filled-from-the-region
title: "A small town's openings are filled from the wider region when almost nobody in town is looking"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: high
root: none
source: added with npm run pool -- add
---

**What.** A town of 227 jobs holds 17 to 50 openings all year and fills 26, so every retirement shrinks it: its jobs fall 227 to 198 in a played year with no shock. Real small-town employers fill openings from commuters and movers in the wider labor market. Seen: a small town's job count and its employers' postings after a played year. Seen: a small town's postings filled by people from the next town over.

**Cause.** Measured: East Middlebury, Vermont (5021700), seed 438e5a13538d2ae27e8f89dea7e2dc366a977cd53c7b43bc5f2189246976475b, one played year, bookkeeping off, same on clean main and on the staffing fix: jobs 227 to 198; town-run rows 39 left-work, 26 layoff, 26 hire; regional rows 135 hires and 9 layoffs; open positions by month 17, 50, 48, 44, 44, 45, 40, 39, 44, 44, 44, 39. The seekers table (src/core2/modules/jobs.ts) holds the town's own people and its counted seekers; the town's market has no applicants from outside it, and people living elsewhere are run by src/core2/jobs-elsewhere.ts (monthly pulls), which never apply to a posting here. What is not yet measured: how many seekers the town had that year, and which opening types stayed open.

**Fix.** Let the wider region's people apply to a town's postings through the same chooser, at the coarse cadence jobs-elsewhere.ts already runs: a person living elsewhere in the labor market area weighs the posting's pay and the commute against their own work, by the one scoring in choice.ts. Prove it at three drawn small places over 24 months: employment, openings and the commuters hired by record id.

**Time box.** 8 hours

**Rules.** No dice: who applies follows pay, distance and the person's traits through the one chooser, never a roll. One engine: the same posting, the same scoring. Real rates check totals (BDS and the LEHD commuting flows), never set one firm's outcome.

**Done when.** A second session, at a drawn small place and seed nobody chose, plays two years in dev mode and sees the town's openings filled by named people who live elsewhere, with their record ids and the commute, and the town's job count holding within a tenth with no shock.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/jobs-elsewhere.ts, src/core2/choice.ts
