---
id: world-jobs-opening-seekers
title: "The opening's job seekers follow the labor-force counts, not the neediest jobless adults"
area: world
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by: claude/opening-seekers-region
pr: #5211
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:29:47.477Z
---

**What.** `openSeekers` and `openCountedSeekers` in jobs.ts pick the opening's seekers by neediness alone (fewest days of money; fewest earners in the household), as many as the unemployment rate implies. Replace the pick with the labor-force structure: split the seeker count across age bands by each band's unemployment rate against the overall rate (CPS annual averages), then pick the neediest within each band, for full people and counted adults alike. Update the stopgap row SG-WORLD-jobs-opening-seekers to what remains faked.

**Rules.** Estimate, never UNKNOWN: the age ratios are a sourced table in `src/core2/data/jobs/`, tagged SOURCED with the BLS table cited. No dice: the within-band pick stays need-ordered. One model, two tiers: full and counted people use the same band quotas. One rule, all 56 places: the national ratios apply to every place's own rate.

**Done when.** In a drawn place of `buildBenchWorld` two-level at day 0, the seekers' age-band shares match the table's implied shares within one person per band, by seeker record ids, and a test in `src/core2/jobs.test.ts` checks it; SG-WORLD-jobs-opening-seekers is narrowed or resolved in `stopgaps.json`.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/age-unemployment.json, src/core2/data/stopgaps.json

**Notes.** Looked at Oct 19 (claude/political-game-pool-3xfqef-2), not built: the CPS unemployment rate by age (bls.gov/cps/cpsaat10.htm, annual averages) could not be retrieved with a citation from the cloud session (search returned only secondary figures), and the rules forbid unsourced numbers. A builder with web access fetches Table A-10 first.
