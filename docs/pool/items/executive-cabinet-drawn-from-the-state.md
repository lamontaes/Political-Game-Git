---
id: executive-cabinet-drawn-from-the-state
title: "State cabinet secretaries are copied from the played town's households and moved into it"
area: gov
kind: bug
priority: 2
size: M
status: merged
claimed-by: thread cluster 29 part 3
pr: 9385
blocked-on:
source: Door scenes reader (#9288, head c9171e33 on train b7ed6337) and the account lead's code reading, Nov 14
claimed-at:
after: core-bookkeeping-changes-the-played-year
lead: governing
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** At small-town doors (Clio MI, Oakland AR, Kennebec SD on #9288), two ordinary residents who "started somewhere new" give their job as "adjutant general" and "transportation secretary". Every state cabinet secretary is a newcomer who lives in the played town, whatever its size and wherever the state capital is. Seen: at the doors, in what a resident says they do for a living.

**Cause.** Found in code: `appointStateCabinet` (`src/core2/modules/executive.ts`) draws each post's candidates with `drawnAdult` (`src/core2/modules/counted-moves.ts`). `drawnAdult` builds a new household modeled on one of the played town's own counted households (`drawnResident`, "Drawn from the place's counted people"). `seatCabinetPerson` then admits that household into the played town (`admitCountedHousehold`) and starts the person's state job (`startPublicJob`, post `state:<key>`). The legislature-confirmed path, `stateNominationInput`, draws its pool from `api.state.people`, which are also the played town's full people. The town's and county's own department heads (`fillTownPost`, `townPostInput`) use the same draw from the town's counted people. There a resident of the place is right, since the town or county that runs the place appoints its own heads, so they stay as they are.

**Fix.** Draw a cabinet appointee from the state's people where the state's population puts them, through the tier that already holds the rest of the state (the country tier's cells and the state-to-state flows built in #9326; no new person store). The appointee lives where that draw puts them. They come to live in the played town only when the record says so: the played town is the capital, or the draw by population lands there. Never copy a household from the town's counted people and admit it. Apply the same rule to the confirmation draw from `api.state.people`.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the capital and the state's population come from data, never a named place. Wire to the world: the appointee is a person the state tier holds, paid by the state government's payroll. Unattended-world changes: year 1 and time per record at three places, with and without, twice each side.

**Done when.** A test pinned to a small town that is not its state's capital (place and seed named in the test file) finds, after the opening, every state cabinet holder outside the played town's households unless the draw by population placed them there, and the same at a capital town, where some may live in town. A one-year run at three places, with and without, twice each side, shows the time per record. A second session, in a drawn small town, knocks on doors for a year in the running game and meets no state cabinet secretary who moved in from nowhere.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/core2/places.ts, src/core2/modules/voting.ts, src/core2/modules/officials.ts, src/core2/cabinet-from-the-state.test.ts

**Notes.** Filed by hand from the code reading at the coordinator's request; the door builder's place, seed and person will be added here when they arrive.

Built on branch claude/project-thread-86yqt4 (Nov 15). The opening cabinet draw now picks each candidate's home with `drawStateHome` (src/core2/places.ts), the population-weighted draw the running-mate newcomer already used (moved out of voting.ts so both read one rule): the played town at its share of the state's people from the country tier (`countryStateParts`), otherwise one of the state's towns by population; the played town always when it is the state's seat (`coreSeatOfGovernmentPlace`). A secretary from elsewhere is filled in where they live (`fillInIdentity`, name and birth date as an official's, the opening's temperament) and never admitted to the town. Measured after the opening: Edgar WI, seed edgar-petition-1, 0 of 13 secretaries in town (13 before); Pierre SD, seed pierre-cabinet-1, 13 of 13 in town.

The player governor's own pick (`stateNominationInput`, read by `stateCandidates` and `appointStatePost`) copies and moves no one: its pool is people the world already holds, each where they live. It still offers mostly the played town's people, because those are most of the full people. Offering strangers from across the state there needs their names on the office screen before they are filled in (src/bench/office.ts reads names with `personName`, which knows only full people and officials), and a read-only screen may not create people. Filed as executive-governor-pick-offers-the-state.
