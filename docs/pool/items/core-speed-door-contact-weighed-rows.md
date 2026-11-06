---
id: core-speed-door-contact-weighed-rows
title: "Montpelier election year: door contacts' weighed choices are most of the event log (cut them without breaking the donor meeting's reads)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Montpelier, Vermont (5046000, seed 5a1c0de7a11ce5e1), year 4: the log holds about 106,000 person.weighed rows after 100 days from 467 people, 459 of them tied to the player only by a door answer (kind contact), each weighing believe-claim, retell, sign-petition and parties.attend choices several times a day.

**Rules.** Keep what the player's circle reads (CTO Nov 5). No dice. A cut must keep the donor meeting and campaign-turn reads.

**Done when.** A door-only contact's weighed choices are dropped after a day (or never kept) while campaign-turn.test.ts and donor-meeting.test.ts pass on drawn places, and a Montpelier run shows the log under 150,000 rows through year 4.

**Files.** src/core2/trait-decisions.ts,src/core2/choice.ts,src/core2/why-kept.ts,src/core2/decision-detail.ts

**Notes.** State Sessions Nov 6, tried and reverted. (1) Not adding a door answer to focus (state.ts relationship change) broke 6 campaign-day tests: the canvasser reads focus to choose who to reach, so focus must stay. (2) Skipping the weighed record for people whose only tie to the player is a contact (metOnlyAtTheDoor in why-kept.ts, used by keepWeighing and keepChoice) cut the rows from 106,628 to 1,005 at day 100 of year 4, with campaign-day, doors-fold, door-balance and rival-help tests passing, but made campaign-turn.test.ts (a rich rival holds an event; reporters ask) and donor-meeting.test.ts (asks each person in the host's room) fail: those engines read a guest's or voter's kept weighed record. So the record is a read, not only a trace. Next try: keep it one day for a door-only contact (a second drop queue in decision-detail.ts), and prove the donor meeting reads the same day.
