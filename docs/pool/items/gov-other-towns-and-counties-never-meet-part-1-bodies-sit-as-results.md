---
id: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
title: "Other towns' and counties' bodies sit and keep only their result"
area: gov
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: high
root: rc1-world-outside-town
source: split from gov-other-towns-and-counties-never-meet in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results
---

**What.** Outside the player's own town, no local government does anything: in a played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af) all 25 local sittings were the player's own board. This part makes other towns' and counties' bodies decide through the one body engine at a coarse level, on the days they sit, from the views of the people there. Only the result is kept: the law or budget in force, its date and the vote count. Feeds: gov-other-towns-and-counties-never-meet-part-3-readers-and-speed.

**Cause.** Needs cause. The earlier cause (only `townBodies` gets meetings, and seatOutsideOffices seats the other bodies) differs from the code, found by opus-d23b (PR #8269) and confirmed by opus-5234 on main 3991b3404a: src/core2/modules/offices.ts seatOutsideOffices is called only for other state-level places' chambers, governors and statewide executives (lines 766 to 778) and for Congress seats when first read (line 1119); local offices are made only for the player's own place (`localOfficesForPlace(placeKey!)`, line 712). No other town's council or county's board exists as an office row, so `townBodies` (world-legislating.ts line 250) has nothing more to schedule. A finder names the writer that would seat other local bodies from each place's data, and whose views a coarse sitting there reads, since another place has no full or counted residents in a played world.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, read by the one body engine, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it, named by record id. The speed rule applies: results only, on the days a body sits, and nothing scans every town every day (owner, Nov 5: "generate on demand").

**Done when.** A second session, in the running game with the Place field empty (a drawn place, written down with its seed), plays one year with dev mode's Run on the Calendar and finds dev mode's Watch panel listing results from at least three other towns or counties in the player's state, each with a law or budget they changed in the year, its date and its vote count, by record id. In Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year, local results are no longer the player's own board alone, where all 25 sittings were.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/offices.ts, src/core2/data/offices/bodies.json, src/bench/ui/dev-watch.mjs

**Notes.** Released (2026-11-10): Cause differs from code: seatOutsideOffices seats only other states' chambers and executives, and local offices exist only for the player's place (offices.ts:712), so no other town or county body exists to schedule. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:43 UTC) on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.

Released (2026-11-10): Re-offered after opus-d23b released it (PR 8269); confirmed no other town or county body is seated (offices.ts:712), marking its Cause Needs cause. Continue on branch claude/pool-gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results.
