---
id: gov-special-elections-every-counted-seat
title: "Special elections for another state's senator, member of the House and statewide executive are counted races, not the appointee stand-in"
area: gov
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
kind: feature
priority: 2
size: S
status: merged
claimed-by: claude/project-thread-sltsoz
pr: #9314
after:
blocked-on:
source: Account lead, stopgap cluster 9 (owner, Nov 14)
---

**What.** A seat that empties outside the town (another state's senator, another state's member of the House, another place's statewide executive) waited on a special election day and was then filled by a stand-in that gave it to the best-suited eligible person. Now the world counts it as a race between the two major parties' named candidates, the winner serves the unexpired term, and the winner's party and name are on the seating record. Seen: the paper's and the Journal's special-election result for a seat elsewhere, and the new member's party, are the count's.

**Cause.** Found in code: src/core2/modules/voting.ts `openSpecialRace` took only House districts and legislative districts that had a seat row, so a senator, an outside statewide executive and a member the officials engine holds with no term (src/core2/modules/offices.ts `vacateUnheldSeat`) fell to `officesCalendarWork`'s stand-in.

**Fix.** `openSpecialRace` and `decideSpecial` in voting.ts count every seat the world's races count in a general election, naming an unheld seat from its vacancy; `unheldVacancyWon` in offices.ts fills the vacancy and writes the took-office record with the count's winner; officials.ts `seatUnheldFiller` seats that person. SG-GOV-special-election-appointee, SG-GOV-special-election-timing (now the ESTIMATED day count in parameters.json) and SG-GOV-dual-office-law (now ESTIMATED rows) are removed.

**Time box.** 4 hours.

**Rules.** No dice; one race engine; replace, never layer. A territory has no counted electorate and still uses the stand-in, under SG-GOV-territory-legislature-race.

**Done when.** In a played year at a place and seed the second session draws, a vacancy in another state's Senate or House seat has a counted special race with two named candidates and the seat's member afterward is that race's winner in that party, by race and record id; second session.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/special-election-seats.test.ts
