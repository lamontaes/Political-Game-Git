---
id: gov-ticket-office-follows-governor-race
title: "A lieutenant governor elected on the governor's ticket takes the governor race's winning party, never a different one the same night"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-outside-ticket-raced-alone)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** In about thirty places the law elects the lieutenant governor on one ticket with the governor, but the world's races count that seat on its own, so the same night can seat a lieutenant governor of the other party. Seat the running mate of the party that won the governor's race, the same day. Seen: on the election night results and the governor's office page, where both offices show the same party.

**Cause.** Found in code: `src/core2/modules/voting.ts` lines 5038 to 5041 (`racesIn`) races every outside executive on its own seat and registers `SG-GOV-outside-ticket-raced-alone`; `electedWithGovernorOnTicket` in `data/research/offices/state-offices.json` is read only by `src/core2/modules/officials.ts` lines 455 to 474 for the opening holder.

**Fix.** In `racesIn`, for an executive seat whose research row has `electedWithGovernorOnTicket`, do not count it separately: when the same state's governor race is decided, put the ticket office's race row with that race's `winnerParty` and `leanSource` "elected on the governor's ticket" (the same string officials.ts uses), seated by the same `seatRaceWinner`. A state with no governor race that year keeps the seat as it is. Delete the stopgap marker and resolve the row.

**Time box.** 4 hours for one sonnet session.

**Rules.** Replace, never layer: the separate count for a ticket office is removed, not left beside. One rule, all 56 places: the office list is the research row, no state named. No dice. Speed: no extra count; the ticket race row is written from the governor race's result.

**Done when.** A second session runs a played world for four years in a drawn place with a seed it did not choose, finds an election year with a governor race in a ticket state (naming that state by the research row), and sees, by race record id, the lieutenant governor seated in the governor's winning party on the same day in every ticket state that year, including the town's own state when it is one. A test in `src/core2/offices-every-legislature.test.ts` fails on main for the opposite-party case. `SG-GOV-outside-ticket-raced-alone` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/offices-every-legislature.test.ts, data/research/offices/state-offices.json, src/core2/data/stopgaps/gov.json
