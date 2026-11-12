---
id: core-moves-state-officials-move-to-same-state
title: "National officials and press people in a state's or D.C.'s record 'move away' to the same place every few weeks"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: lives/moves-state-destination
pr: #7055
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T21:04:27.901Z
---

**What.** The moves engine's town adults include people whose place is a state's or D.C.'s record (national cabinet members, state cabinet members, national press reporters and heads), because they are full people of an active tier. Each builds the stage-of-life pull, and on leaving, destinationFor finds no county and returns their own place (US-NJ to US-NJ, US-DC to US-DC). Then leave() ends their job, takes their cash out of town and sets them to the husk tier. In Hamburg, New Jersey (3429220, drawPlace seed lives-a), 20 such departures in one played year on main 1cdbf9da: official:cabinet:US:attorney-general:2 on 2025-03-17, person:cabinet:US-NJ:attorney-general on 2025-08-12 with its job hold read, person:press:outlet:national-paper:0:national:reporter:0 on 2025-03-04, and so on (scratchpad probe, moves departures watch).

**Rules.** One rule, all 56 places: who the moves engine reviews follows where each person lives, read from their place record, never a named state or office. No dice: a move still comes from the person's own pull and the chooser, with ACS rates checking totals.

**Done when.** In a one-year buildBenchWorld run of a drawn place (place and seed named), no departure has destinationId equal to fromPlaceId for a person not of the inactive tier, and no national or state official or press person loses their job through a move; moves.test.ts asserts it.

**Files.** src/core2/modules/moves.ts, src/core2/moves.test.ts

**Notes.** Found by the lives lead on core-every-life-simulated, Nov 1. Moves reviews 'town adults' as every alive non-husk person, so state- and nation-level people are in it. Likely fix: review only people living in the played town's places (townPlaceOf, focusPlaceIds), the rest by their own engines (offices, press).
