---
id: gov-world-races-run-no-governors
title: "M2-10: no governor race outside the player's state is ever run; 35 states elect one in November 2026"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The new M2-10 check (src/bench/m2-10-check.ts) in Fort Myers Beach, Florida (place key 1224150, seed 40d19d5aa53ea43b2f08600258d255a8e64dc3307f48afd84d58bbfc387c5051) played the 2026 general election: 439 House, 34 Senate and 139 state legislative races ran and were seated, but no governor race. The officials module seats every governor at the opening (src/core2/modules/officials.ts:4), and the town's own governor is on its ballot, but src/core2/modules/world-races.ts builds races only for the House, the Senate, legislatures and the presidency. So every other state's governor serves forever.

**Rules.** One rule, all 56 places: governor races outside the player's state run on the same counted engine as the House and Senate, from each state's own election calendar in data. Wire to the world: the winner takes office on that state's real inauguration date and is read by the executive engine.

**Done when.** The M2-10 command, in Fort Myers Beach, Florida (seed above) and a second place drawn from all 56, shows every governor race outside the town's state that its calendar holds in November 2026 run, counted in places with reasons, and the winner serving from the state's inauguration date, by record id in the PR body.

**Files.** src/core2/modules/world-races.ts, src/bench/m2-10-check.ts

**Notes.** Found by the M0-M2 lead writing M2-10's command, Oct 24. Blocks roadmap M2-10.
