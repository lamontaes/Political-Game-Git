---
id: elections-vote-at-the-right-polling-place
title: "A voter at the wrong polling place can go to the right one and vote there"
area: elections
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: scene-trouble-at-the-polling-place
blocked-on:
source: "Account lead T19, Nov 15, step two of the player's registration (PR 9450)"
lead: elections
claimed-at:
model: opus
effort: medium
root: design-story-director
---

**What.** A voter whose registration puts them at another polling place (they moved within the town, or the precinct changed) is told by the poll worker where to go, goes there, and votes there. Today the worker can only say that the voter is not in the book, and the voter cannot cast a vote anywhere else. Seen: the poll worker names the right place by its building, and the ballot opens when the voter is at that place.

**Cause.** Found in code: src/core2/modules/voting.ts `castBallot` and the count read the ballot by the voter's own registration and precinct (`pollingPlaceOf(api, personId, date)` and `registrationReading`), so no vote is cast "at" another polling place; src/director/polling-place.ts stages one visit per voter at their own place and `src/director/poll-problem.ts` therefore cannot offer "go to the right place".

**Fix.** Give the voting engine one rule for a vote at a place other than the voter's own precinct where the state's law counts it (a record on the law row, never a roll), keep it in `pollDays` with the place, and let the visit be staged at the place the voter is sent to; the poll worker's lines name the place from `pollingPlaceOf`. Reuse `registrationReading` for who is on the rolls where.

**Time box.** 6 hours.

**Rules.** No dice; the state's own rule is data (`one-rule-all-places`); an effect is a read: the count, the turnout and the Journal read the day's row (`wire-to-the-world`); nothing is cast for the player without their press.

**Done when.** A second session, in a drawn place and seed it writes down, plays a player whose registration sits at another precinct to election day; the worker names the place; the player goes there, marks a ballot, and the count shows the vote at that place by record id, with the Journal line.

**You will see.** The worker says where to go; at that place the ballot opens.

**Waits on.** `scene-trouble-at-the-polling-place` (PR 9450).

**Files.** src/core2/modules/voting.ts, src/director/polling-place.ts, src/director/poll-problem.ts

**Notes.** Provisional ballots (account lead, Nov 15, PR 9450): in a state that lets a voter not on the rolls cast a provisional ballot, the game does nothing today. No provisional ballot is offered, cast or counted; the poll worker's scene refuses the ballot or offers the same-day table, and the refusal is kept as the voting engine's `not-on-the-list` day. Building it belongs to this item: the ballot is kept apart, and the county counts it only once the registration record shows the voter was eligible. No stopgap row is registered (no new stopgaps); this line is the record.
