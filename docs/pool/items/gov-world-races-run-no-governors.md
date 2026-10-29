---
id: gov-world-races-run-no-governors
title: "M2-10: no governor race outside the player's state is ever run; 35 states elect one in November 2026"
area: gov
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The new M2-10 check (src/bench/m2-10-check.ts) in Fort Myers Beach, Florida (place key 1224150, seed 40d19d5aa53ea43b2f08600258d255a8e64dc3307f48afd84d58bbfc387c5051) played the 2026 general election: 439 House, 34 Senate and 139 state legislative races ran and were seated, but no governor race. The officials module seats every governor at the opening (src/core2/modules/officials.ts:4), and the town's own governor is on its ballot, but src/core2/modules/world-races.ts builds races only for the House, the Senate, legislatures and the presidency. So every other state's governor serves forever.

**Rules.** One rule, all 56 places: governor races outside the player's state run on the same counted engine as the House and Senate, from each state's own election calendar in data. Wire to the world: the winner takes office on that state's real inauguration date and is read by the executive engine.

**Done when.** The M2-10 command, in Fort Myers Beach, Florida (seed above) and a second place drawn from all 56, shows every governor race outside the town's state that its calendar holds in November 2026 run, counted in places with reasons, and the winner serving from the state's inauguration date, by record id in the PR body. **On screen.** Nothing yet: filed play-governor-races-on-screen, which puts it on the election night results.

**Files.** src/core2/modules/world-races.ts, src/bench/m2-10-check.ts

**Notes.** Found by the M0-M2 lead writing M2-10's command, Oct 24. Blocks roadmap M2-10.

Sent back 2026-10-24 from PR #5969 (branch claude/world-governor-races): integrated a7863bc3c4 adds governor winners only to world-races.ts:1228–1235 race-ledger seats, leaves the opening officials governor unchanged, and has no executive reader as its own open SG-GOV-world-governor-executive admits; m2-10-check.ts:118–130 accepts the ledger row as seating but does not meet this item’s serving-governor/executive-reader acceptance. Supply named actual term/reader evidence or split an honest bounded race-counting item with this acceptance and flags unfinished; finish on this branch, merge main into it first. No completed gate or runtime-failure claim.

Oct 24, 2026: split per that send-back. The race counting and winner record are gov-world-races-governor-races-counted (lamontaes/Political-Game-Git#5969). This item keeps its acceptance: the winner serving as governor from inauguration day, read by an executive engine (SG-GOV-world-governor-executive).

Already fixed on main (Claude worker, Oct 27): `src/bench/m2-10-check.ts` now reports `governors: 36` (and 36 recorded winners with places and reasons) outside the player's state in Santa Rita, Guam (seed b3948044…26de), Waipahu, Hawaii (seed m2x2) and Beech Mountain, North Carolina (seed m2x1), where the legislative clause was the only failure before PR 6186. Left open for the CTO or a merger to close as done-by-main.
Oct 27 (claude pool worker): checked again on main. world-races.ts governorRaces (line 179) runs every other state's governor race and seat() (line 1218) seats the winner in the offices engine, so the race-counting half is done (the Oct 27 note above). What remains is this item's own acceptance, a winner "serving as governor from inauguration day, read by an executive engine" for a state other than the player's (SG-GOV-world-governor-executive, src/core2/modules/world-races.ts line 213): no engine acts as another state's executive today. That is a modeling item (what another state's governor does each month at a coarse level: signs or vetoes the state's bills, appoints, sets the budget line, through the same engines the player's state uses), not a bug fix, so it is released unbuilt at S/3 hours; it needs a design pass by the governance lead before a worker.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
