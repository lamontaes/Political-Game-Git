---
id: history-states-legislatures-from-the-century
title: "Day one's state legislatures are the ones the century since 1925 elected"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/history-states-legislatures
pr:
after: history-states-executives-from-the-century
blocked-on:
lead: elections
model: opus
effort: high
root: rc1-world-outside-town
source: owner's answers to the calibration audit, Nov 17, 2026 (CTO line 6935086070 on #9747, "who holds every office, party control"); History lane plan on #9747, PR 3b, approved with two conditions in CTO line 6937011121
checked:
---

**What.** Every world opens with every state legislature seated from the real roster, so no world's chambers differ from today's, and the next race in each House and legislative district counts it at its 2024 result. The owner ruled that day one is what a history from 1925 produced.
Seen: every drawn world on main seats state legislators from legislature-party-counts-2026.json, and `legislativePlace` and `housePlace` lean each district at its 2024 vote.

**Cause.** Found in code: src/core2/offices-state.ts `stateOffices` seats each legislative seat's party from the roster (line 685); src/core2/electorate-places.ts `worldRoster` gives every engine the roster's chambers; `housePlace` (line 464) and `legislativePlace` (line 518) place each district at its 2024 result.

**Fix.**

1. src/core2/electorate-century.ts elects every state legislative seat in its own cycle from 1925 on the one count path: the played town's state seat by seat, every other state's chambers as results (each district its own place in one count per chamber and situation), each chamber's term limit from state-offices.json. The legislatures are their own pass (`runLegislatures`), run on the loading screen after the century's other offices, which they do not feed, and on first read elsewhere, so the core century stays under a second.
2. Each district has its own eligible voters (a seeded size within `centuryDistrictSizeSpread`), and a race's share is taken from the unrounded count (electorate.ts `countPlaces` returns `exact` beside the rounded votes), so no two races print one share.
3. A chamber most of whose published members belong to no national side (Nebraska's, elected without party labels) keeps the real record; a winner carries the chamber's own party of their side (Minnesota's Democratic-Farmer-Labor).
4. `worldRoster` gives every engine the century's chambers; `housePlace` and `legislativePlace` stand each district where the century left it.
5. Dev mode's "How this world opened" shows the town's state legislature and the chambers each party holds across the country.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No dice: each seat goes to the side the one count gives it from the district's lean, the candidates and the year's tide, never a roll. Replace, never layer: the real roster is read only under the "today" setting.

**Done when.** A second session starts a new game at 1440x900 in a drawn place it writes down with its seed, opens dev mode's "How this world opened" and sees the state legislature on day one by party from the century; the town's legislators hold the century's seats, and src/core2/electorate-century-legislatures.test.ts passes at three drawn worlds.

**Waits on.** history-states-executives-from-the-century (#9838), which this branch is stacked on.

**Files.** src/core2/electorate-century.ts, src/core2/electorate.ts, src/core2/electorate-places.ts, src/core2/electorate-inputs.ts, src/core2/modules/elections.ts, src/core2/data/history/century.json, src/core2/data/stopgaps/hist.json, src/bench/world.ts, src/bench/dev-views/opening.ts, src/bench/dev-views/opening-sources.json, src/core2/electorate-century-legislatures.test.ts (new)

**Notes.** Filed by the History lane, Nov 17, 2026. Territories whose legislatures have no party record keep play's handling (SG-GOV-territory-legislature-race, SG-HIST-century-parties) until the parties unit (family 9).
