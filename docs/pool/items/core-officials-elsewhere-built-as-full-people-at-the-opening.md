---
id: core-officials-elsewhere-built-as-full-people-at-the-opening
title: "Officials elsewhere are built at the opening: 716 of 910 full people on day one were officials somewhere else (Caño Martín Peña, Puerto Rico), with 21,030 office-term records after one year in a Vermont village"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr: #8390
after: core-officials-elsewhere-part-1-past-terms-on-demand
blocked-on:
lead: fable
model: opus
effort: high
root: design-country-tier
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 3, "The legislators are built at the opening anyway", and Pillar 7)
checked: fable 2026-11-10
claimed-at:
---

**What.** Most of the people and office records the game builds on day one belong to officials the player will never meet. Measured in Caño Martín Peña, Puerto Rico (seed 50fe2d1143af): 716 of the world's 910 full people on day one were officials somewhere else; another 139 lived in the town, 31 worked for the press and 24 were others. A village in Vermont held 21,030 office-term records after one year, the largest table in the game, and 34,088 by year four; on day one of a North Dakota game the Play as list offered 6,489 officeholders. The owner ruled on November 5 that other states' legislators are not built at the opening and are named and built on demand. For every office of another state or territory the opening keeps a result (the seat, the party holding it and the views its body decides from) and writes no named holder and no term history; the person, their name and their past terms are built the first time the player meets or opens them, the same every time. Officials in the player's own chain who serve somewhere else vote from the same kept views and are not walked daily or given a home and bills until met or opened, unless the country tier design says a group stays full.

**Cause.** Found in code: src/core2/modules/offices.ts `seatOutsideOffices` (line 792) writes a term row and a named holder for every outside seat (21,277 state terms on day one in St. Stephen, South Carolina, seed 1f0206147ad606b1ef8d02da84f3e7d17b8db42ee383582655128630054e3932), and src/core2/modules/officials.ts makes full people at the opening of every member of Congress, the governor, statewide executives and the home state's legislators (header lines 4 to 12, `specs`). Measured: Caño Martín Peña, Puerto Rico, seed 50fe2d1143af, 716 of 910 full people on day one are officials elsewhere.

**Fix.** For another state's offices keep a result (seat, party, views the body decides from) and no named holder or term history; build the person on first meeting or opening, seeded so the same person returns (the on-demand path is `holderOf`, officials.ts line 1136). Decide in the PR which of the player's own chain (Congress, home legislators) stay full, per docs/design/country-tier.md, and stop walking daily those who are not (src/core2/calendar.ts `duePeople`, line 126).

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: nothing walks every official in the country every day, and the first year keeps only what play reads, so a year stays under the bar and records do not grow with seats nobody opens. One model, two tiers: an official nobody in the town has met is filled in when met or opened, seeded from the world so the same person comes back, matching what the records already say (the seat, the party, the votes counted). Replace, never layer: the opening pass that names every outside seat's holder and writes their past terms is replaced by the on-demand build in the same change, and the PR body counts the rows and people removed. Owner, November 5: "you dont need to do a whole huge record keeping thing. just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand"; owner, November 8: "every single thing that's measurable does not need to be measured for every single person."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed. On day one dev mode's Watch panel on the Calendar shows the count of full people split by who they are (living in the town, press, officials of the player's own chain serving elsewhere, officials of other states) and the count of office-term records split the same way (the builder adds these lines to Watch from the same records if none shows them). Officials of other states: no full person and no office-term record. Officials of the player's own chain serving elsewhere: none walked daily, or the PR body quotes the country tier design saying which group stays full. Open Advanced, Play as, pick a state senator in another state, and take the seat: the person is built then, with a name, a party and a past that agree with the seat's record, and a new game on the same seed gives the same person. Play one year with dev mode's Run: other states still change laws with vote counts, and Congress still votes; records kept, memory and the seconds the year took are reported before and after. Then the named repro, Caño Martín Peña, Puerto Rico, seed 50fe2d1143af: day one no longer has 716 of 910 full people as officials elsewhere. A test draws a place and fails if a full person or a term record on day one belongs to another state's office that nobody has met or opened.

**Waits on.** Nothing. The country tier it reads is on main (pull request 8116).

**Files.** src/core2/modules/officials.ts, src/core2/modules/offices.ts, src/core2/calendar.ts, src/core2/modules/world-legislating.ts, src/bench/ui/play-as.mjs, src/bench/ui/dev-watch.mjs

**Notes.** Fable's country tier design (pool item core-country-tier-first-slice) decides the shape; this item is the measured defect it must close. From the Fable audit, Pillar 3 and Pillar 7. Measured there: the count of full people in the Puerto Rico world only; the office-term counts in "a village in Vermont" (Pillar 3 does not name it; the audit's 20-year run was South Hero, Vermont, seed 9bf1ede27ce5a00e); the Play as list in "a North Dakota game" (the audit's Play as session was in Davenport, North Dakota; no seed given). The audit did not break the 716 down by office. One point where the code on main differs from the audit's wording, read Nov 10 (helper): `officials.ts` makes full people at the opening of every member of Congress and of the governor, statewide executives and legislators of the town's own state, and says another state's officials "sit as named officials on their term rows ... one becomes a full person here only when the player meets or opens them". So, as far as the code says, another state's legislators are named term rows on day one and not full people, and the 716 are members of Congress and the home state's officials. The Nov 5 ruling's point 4 as recorded covers the first group (named and built on demand, not at the opening). For the second group AGENTS.md's two-level rule lists officials among the people who are full, and the Nov 5 ruling keeps full records for the player's own state and Congress, so whether they stay full people walked daily is the design's call, which is why Fable leads this item. Helper's check on main, Nov 10 (read-only script; drawn place St. Stephen, South Carolina, world seed 1f0206147ad606b1ef8d02da84f3e7d17b8db42ee383582655128630054e3932, day one): 988 full people, 125 of them living in the town, and 21,397 office-term rows, of which 21,277 are state terms (7,881 serving and 13,396 already ended). Related: `core-long-run-election-and-term-rows` (open, priority 1: folding term and returns rows over the years; this item stops them being written on day one), `laws-property-tax-billed-to-every-home-in-the-world` (officials elsewhere own homes and pay the played town's tax), `gov-other-towns-and-counties-never-meet`, `play-states-screen-opens-any-state` (the screen that opens them on demand).

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:39 UTC) on branch claude/pool-core-officials-elsewhere-built-as-full-people-at-the-opening.

Released (2026-11-11): Part 1 (other states' earlier terms written when the holder is opened) is core-officials-elsewhere-part-1-past-terms-on-demand on PR 8390; the rest (no named holder or term record for other states on day one, the Watch counts, Play as building the person, the player's chain walked daily) is still this item's, its branch reused by part 1. Continue on branch claude/pool-core-officials-elsewhere-built-as-full-people-at-the-opening and pull request #8390.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 01:04 UTC) on branch claude/pool-core-officials-elsewhere-built-as-full-people-at-the-opening.

Released (2026-11-11): Waits on its part 1, core-officials-elsewhere-part-1-past-terms-on-demand (PR 8390), now named in after:. Continue on branch claude/pool-core-officials-elsewhere-built-as-full-people-at-the-opening and pull request #8390.
