---
id: speed-dev-skip-four-years-costs-a-quarter-to-half-more
title: "Dev Skip over four years takes 26% to 50% longer since skipped time counts races"
area: core
kind: bug
priority: 3
size: S
status: open
after:
blocked-on:
source: "Account lead G1 speed measure for the #8606 replacement, Nov 14, 2026"
lead: speed
standard: 2
model: opus
effort: medium
root: none
---

**What.** Since results mode files and counts every race day by day, a four-year dev Skip takes 26% to 50% longer than the skip without it. Only dev mode's Skip year button reaches it, because `advanceCore` with `results: true` is called only from `runYear` in `src/bench/dev-mode.ts`, behind the dev route. A played year is unchanged, with the same record counts and fingerprints in all twelve years measured. Seen: the Skip button in dev mode takes about 40 seconds a year where it took about 26 in Lakin, Kansas.

**Cause.** Measured: `node --import tsx` of `advanceCore(core, +1461 days, { results: true })` on the train 5fc60b90 and on that train with #8606 and the test fix, one process at a time (seconds, base then branch): Lakin KS (9f8e7d6c5b4a3921) 102.8 then 150.2 (+46%); Star Valley AZ (1a2b3c4d5e6f7081) 110.0 then 165.1 (+50%); Eskdale WV (aa11bb22cc33dd44) 50.3 then 63.2 (+26%). Played years at the same three places, seconds base then branch: year 1 47.8/54.1, 47.7/50.0, 32.5/28.7; year 4 85.8/90.5, 110.6/115.2, 49.4/45.2; records equal in every year. Not read: which of `candidacyDay`, `dropPastNonRunners` or the count takes the added time.

**Fix.** Profile the skip at Star Valley with `scripts/speed-years/profile-year.ts`, name the function that takes the added time, and run it on the day something changed (or the month) instead of every day, as skill `cadence-and-summaries` says.

**Time box.** 2 hours for one Opus session.

**Rules.** Speed: no change makes a year more than 20% slower; one process at a time, three drawn places.

**Done when.** A second session runs the same skip at a place it draws (name the place and seed) and at Lakin KS, Star Valley AZ and Eskdale WV on main and sees under 20% over the skip before #8606, with the same winners.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/life.ts, src/bench/dev-mode.ts

**Notes.** Filed by hand on the Account lead's branch (pool add pushes to main).
