---
id: core-later-years-slower-drive-holders-offers
title: "A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year (Bedford, Wyoming)"
area: core
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/later-years-slower
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:46:21.988Z
---

**What.** A town's later game years run slower than its first, and the cause named when this was filed is that drive holders are offered more acts each year. A commit already stopped scoring a full choice daily for every holder, so the first two years now run level. The third year still runs about twice as long as the first two, so something else still grows with the years. Find what grows between year 2 and year 3 with a CPU profile of year 3, and fix it at the root by acting on the day something changes instead of scanning.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base. No dice: the fix changes no outcome, only when the work is done. Wire to the world: measure in the played world with the bookkeeping off.

**Done when.** In the played world, `npm run speed:year -- --seed 7c1d --years 3 --exclusive` on Mongmong-Toto-Maite, Guam (key territory:GU:mongmong-toto-maite) shows year 3 within 20 percent of year 2, with the three year times and the profile's top function by name in the PR body; the guard in scripts/speed-years/compare.ts passes.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, scripts/speed-years/run.ts

**Notes.** Measured Oct 19 on a cloud machine (slow; compare ratios, not seconds): build 69.3 s, year 1 330.8 s, year 2 333.8 s, year 3 657.3 s, seed 7c1d. Commit a04e82f0f6 already limited the daily drive scoring to the player's circle, which is why years 1 and 2 match. Not yet profiled.
