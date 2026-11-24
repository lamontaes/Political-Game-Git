---
id: campaign-cost-per-record-rises-in-later-years
title: "A played year costs more per record in later years because campaign work and relationship writes grow with the world"
area: elections
kind: cleanup
priority: 2
size: M
status: open
after:
blocked-on:
source: "Account lead G1 speed measure of #8942, Nov 14, 2026"
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** In a played world, a year's time per record rises as years pass, and most of the rise is campaign work and the writes that follow it. Lakin, Kansas (key 2038175, `speed:year` seed 9f8e7d6c5b4a3921), on the train at 998ba95b: year 1 takes 42.9 s for 269,876 records (0.159 s per 1,000) and year 4 takes 64.9 s for 539,673 (0.120 s per 1,000), but a world with 13% more candidates (the PR #8942 world) takes 89.7 s at year 4 for 593,451 records (0.151 s per 1,000), so campaign cost per record climbs faster than the record count. Seen: how long Week and Day take in a play-through of the election years, and the year-by-year seconds printed by `npm run speed:year`.

**Cause.** Measured: `speed:year --seed 9f8e7d6c5b4a3921` (Lakin, Kansas, 2038175), year 4, with `scripts/speed-years/profile-year.ts --seed 9f8e7d6c5b4a3921 --year 4`: on a world with 97 candidate filings instead of 86 (the same 28 races and 61 contests), campaigns made 5,538 impressions in the year against 3,199 and `speech.retold` log rows were 737 against 251. `campaignWork` in src/core2/modules/campaigns.ts took 19.6 s against 14.8 s, `makeStatements` 3.99 s against 2.57 s, `api.relationship` in src/core2/state.ts 4.02 s against 2.85 s on 99,064 calls against 81,151 and a relationship table of 22,238 rows against 17,440. Time per `makeStatements` unit fell (55% more time for 73% more impressions); time per `relationship` call rose about 16% (35 to 41 microseconds) with the table 27% larger. Every figure is in /mnt/project-files/open-prs/speed-8942.md.

**Fix.** Find what makes a `relationship` call dearer as the table grows (an index scan, a per-call copy or a per-call event emit in `relationship` in src/core2/state.ts) and make a call cost the same at 22,000 rows as at 2,000; then find why a retold speech makes new relationships (`retell` in src/core2/modules/campaigns.ts) and act only on the day a listener's view changed, not on every retelling. Do not lower the number of impressions or retellings: those are the campaign. Measure before and after with the same base and machine, one process at a time.

**Time box.** 4 hours for one Opus session.

**Rules.** Speed: a country's year stays under two minutes and no change makes a year more than 20% slower than its base; never scan the whole world or history every day; one rule, all 56 places, so measure in three drawn places. A speed change never changes what the simulation decides: the records proof is identical before and after.

**Done when.** A second session runs `npm run speed:year -- --seed 9f8e7d6c5b4a3921` on main with this change and without it, in Lakin, Kansas and two other drawn places, and sees year 4 time per 1,000 records within 5% of year 1's on the same world and `api.relationship` time per call flat as the table grows, with identical records proofs (`--baseline <main receipt> --same-records`).

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/state.ts

**Notes.** Filed by hand on the Account lead's branch (pool add pushes to main). Figures from the Lakin runs of Nov 14: base train years 1 to 4 took 42.9, 67.3, 47.3 and 64.9 s; train plus #8942 took 49.1, 74.2, 58.9 and 89.7 s.
