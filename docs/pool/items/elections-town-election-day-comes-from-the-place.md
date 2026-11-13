---
id: elections-town-election-day-comes-from-the-place
title: "A town's election day comes from the town's own data row: a New Hampshire town votes for selectmen on November 4 in the game, and New Hampshire towns vote at town meeting in March"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: elections
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, root cause 9, "Place facts are one default stretched over 56 places")
standard: 2
model: opus
effort: high
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** A town's local election day is one default for its whole state, not a fact about the town. Measured on the Government screen in Blodgett Landing, New Hampshire (a random world; the audit gives no seed): the town votes for selectmen on November 4, and New Hampshire towns vote at town meeting in March. Where a state's law lets each town choose its election season and names no default, the calendar gives every town in that state the one option that the most state packs name, and the town itself is never asked. New Hampshire's pack allows town meeting day in March or the odd-year November election, and every place there gets November. Eighteen of the 51 state packs leave the season to each town this way. Each place's local election day must come from its own data row. Seen: the Government screen shows the town's own election day (a New Hampshire town votes in March, not November).

**Cause.** Found in code: `src/core2/gov-rules/municipal-ballot-rules.ts` `resolveMunicipalElectionTiming` (line 65) drops the place (`void placeKey`, line 79) and picks the state-wide option (`nationalTimingCounts`, line 93); New Hampshire towns get November while the law allows March town meeting. Read on main, Nov 10: `resolveMunicipalElectionTiming("NH", ...)` returns `odd-year-november-consolidated` with basis `local-choice-estimated`.

**Fix.** Read each place's own election-season row among the options its state allows (an estimate by form of government, marked ESTIMATED with its source, where the town's choice is not read), and delete the state-wide most-common pick in the same change.

**Time box.** 8 hours for one opus session.

**Rules.** One rule, all 56 places: the election day is read from the place's own row among the options its state's law allows, and no state or town is named in logic. Estimate, never UNKNOWN: a place whose choice is not read takes the option that fits its form of government, marked ESTIMATED with the source, and says so where the player sees the date. Replace, never layer: the rule that picks the most common option for a whole state is deleted in the same change. Research before building: each place row's season is read from the statute or the town's own page and quoted.

**Done when.** A second session starts the bench (`npm run bench`, play at `/play`) with the Place field empty, drawing again until the drawn place is in a state whose law lets each town choose its election season, and writes down the place and seed. The Government screen and the Campaigns screen show the town's next local race on the day its own row gives, the filing clerk's visit names the same day, and a screenshot of each carries the place, the seed and the row's citation. The named repro: a new game in Blodgett Landing, New Hampshire shows the selectmen's race at the March town meeting, not on November 4. A second drawn place in a state whose packs name one season still shows the date it showed before. A test draws a place from all 56 and fails if two places with different rows in one state are given the same day by the state-wide pick.

**Waits on.** Nothing.

**Files.** src/core2/gov-rules/municipal-ballot-rules.ts, src/core2/elections-calendar.ts, src/core2/gov-rules/municipal-election-rule-packs.ts, src/core2/gov-rules/place-slots.ts, data/municipal-elections/92O-national-state-baseline.json, src/bench/government.ts

**Notes.** From the Fable audit, root cause 9; measured on the Government screen in the audit's played life in Blodgett Landing, New Hampshire (every menu, then ten weeks of Day and Week). The audit gives no seed for that world and did not check other states. Read on main, Nov 10 (helper): `resolveMunicipalElectionTiming("NH", ...)` returns `odd-year-november-consolidated` with basis `local-choice-estimated`; the pack's options are `town-meeting-day-march` and `odd-year-november-consolidated` with no statutory default; the file's own header says "A town's own charter can displace all of this, and no charter is read yet." The same shape holds for 18 of the 51 state packs (Maine, Massachusetts and New York among them). Related: `elections-town-council-on-state-municipal-cycle` (open: the election year in a state whose towns vote on a multi-year cycle; same calendar, a different fact), `elections-town-races-have-primaries-where-law-says` (open: municipal primaries), `gov-town-body-default-is-one-board-for-a-whole-state` (the same root cause for board size).
