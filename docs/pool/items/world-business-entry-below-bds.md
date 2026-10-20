---
id: world-business-entry-below-bds
title: "Businesses open at a third of the Census rate in a played year (5 opened against about 16 in eight drawn towns); closures match"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/business-entry-s14
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:17:56.780Z
---

**What.** Businesses open at about a third of the Census rate in a played year: 5 opened against about 16 in eight drawn towns, while closures match. Find why entries run low, whether the entry rule, the capital a founder needs or the demand it reads. Fix it at the cause so the year's openings match the Census count within the stated spread.

**Rules.** No dice: an opening follows a founder's money, skills and the town's demand, never a percentage; real rates check totals only. Wire to the world: each opening moves money, jobs and a place's firm count.

**Done when.** In a one-year run of `buildBenchWorld` in eight drawn places with seeds the builder did not choose, openings land within the Census rate's spread, closures still match, and `src/core2/business.test.ts` states it with each new firm named by record id.

**Files.** src/core2/modules/business.ts, src/core2/business.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
