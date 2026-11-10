---
id: gov-other-towns-and-counties-never-meet
title: "No other town or county body meets: in a played year all 25 local sittings were the player's own board (Caño Martín Peña, Puerto Rico)"
area: gov
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
after:
blocked-on: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results,gov-other-towns-and-counties-never-meet-part-2-roll-call-on-open,gov-other-towns-and-counties-never-meet-part-3-readers-and-speed
lead: nation
standard: 2
model: sonnet
effort: medium
root: rc1-world-outside-town
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "Other towns and counties")
checked: fable 2026-11-10
---

**What.** Outside the player's own town, no local government does anything. Measured in a played year in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af): 130 bills were introduced in the whole world, 111 in the home legislature, 14 in the player's own municipal board and 5 in Congress. All 25 local sittings were the player's own board, and no other town or county body met. The pool item for this, `gov-every-state-and-town-governs`, is marked done. Read in the code on main: the only local bodies given meetings are the played town's own council, county board and township board. So a neighbor town never raises a tax, a county next door never passes a budget, and nothing local happens anywhere for the news, the economy or the player's rivals to read. Fix it at the cause for every place: other towns and counties decide through the one body engine at a coarser level, from the views of the people there, and keep only the result (the law or budget in force, its date and the vote count), with the meeting, the members and the roll call built when the player opens one. Seen: the News tab's stories of what neighboring towns and counties decided.

**Cause.** Measured: Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one played year: 130 bills in the world and all 25 local sittings the player's own board. The cause is in src/core2/modules/world-legislating.ts function openWorldLegislating (line 209), which calls `scheduleMeeting` for `townBodies` only (line 217; `townBodies` is defined at line 250).

**Fix.** Let other towns' and counties' bodies decide through the one body engine at a coarse level on the days they sit, from the views of the people there, keeping only the result (law or budget in force, date, vote count), and build the roll call on open with the existing rollCallOf pattern. The work is split into the three parts named in Waits on; this item is done when all three are merged and the whole Done when below holds.

**Time box.** 2 hours for one Sonnet session, the closing check once the three parts are done. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: which other local bodies exist and when they sit comes from each place's data rows, and the one body engine reads them, with no second engine and no named place. No dice: what another town's board passes follows its members' views and the place's conditions, never a rate, a cap or a chance. An effect is a read, not a record: another town's result counts only when a different engine reads it (the press, the regional economy, a neighbor's price or tax in a household's choice), named by record id. Speed: results only, on the days a body sits, and nothing scans every town every day. Owner, November 5: "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand"; for every government outside the player's own chain, keep only the result and build the detail on open. Owner, November 8: "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance, even simulation kind of stuff."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. With dev mode's Run on the Calendar, play one year. Dev mode's Watch panel then lists results from local bodies other than the player's own: at least three other towns or counties in the player's state each with a law or budget in force that they changed in the year, its date and its vote count, each by record id. Opening one from the News or the Government screen builds its roll call, the same on a second opening and adding up to the count (a screenshot of the list and of one opened result). Records kept and the seconds the year took are reported before and after, and the year stays inside the speed bar. Then the named repro, Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, one year: local sittings or results are no longer the player's own board alone, where all 25 were. A test draws a place, plays a year and fails if every local result in the world belongs to the played town's own bodies. The owner plays it: a year in, the News tells him what a neighboring town's council and his county's neighbors decided, and he can open the vote.

**Waits on.** Its three parts: gov-other-towns-and-counties-never-meet-part-1-bodies-sit-as-results, gov-other-towns-and-counties-never-meet-part-2-roll-call-on-open, gov-other-towns-and-counties-never-meet-part-3-readers-and-speed. Read with world-other-places-coarse-population and core-officials-elsewhere-built-as-full-people-at-the-opening.

**Files.** src/core2/modules/world-legislating.ts (`openWorldLegislating`, line 209, which schedules meetings only for `townBodies`, line 250; `localMeeting`, line 1957; `scheduleMeeting`, line 2072; `rollCallOf`, line 1548, the on-demand pattern to reuse), src/core2/modules/offices.ts (`seatOutsideOffices`, line 792), src/core2/data/offices/bodies.json, src/bench/government.ts, src/bench/nation-news.ts, src/bench/ui/dev-watch.mjs

**Notes.** From the Fable audit, Pillar 3; measured in one played year with the audit's own readings in Caño Martín Peña, Puerto Rico. The audit did not count how many other towns and counties exist in that world's records, and did not run a second place for this figure. `gov-every-state-and-town-governs` is marked done, still shows: its done-when asked for "three other towns' councils holding sittings and enacting laws", and the audit's year found none. Read on main, Nov 10 (helper): `openWorldLegislating` says "The town's council and its county board meet on their own" and calls `scheduleMeeting` for `townBodies(api)` only, the council, county-board and township-board offices in the offices table; every legislature in the session calendar is opened separately, which is why other states do pass laws and other towns do not. Per the owner's Nov 5 ruling these bodies are kept as results, with detail on open, so this item must not seat every council's members as full people or keep their meetings as rows. Related: `core-officials-elsewhere-built-as-full-people-at-the-opening` (the cost of doing this the heavy way), `nation-other-states-change-laws-in-year-one-then-almost-never` (the state half), `world-other-places-coarse-population` (open: a coarse population for every other place, which another town's board would decide from), `laws-other-places-chains` (open: another place's enacted acts reach a worker who lives there).
