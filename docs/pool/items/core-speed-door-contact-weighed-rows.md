---
id: core-speed-door-contact-weighed-rows
title: "Montpelier election year: door contacts' weighed choices are most of the event log (cut them without breaking the donor meeting's reads)"
area: core
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Montpelier, Vermont (5046000, seed 5a1c0de7a11ce5e1), year 4: the log holds about 106,000 person.weighed rows after 100 days from 467 people, 459 of them tied to the player only by a door answer (kind contact), each weighing believe-claim, retell, sign-petition and parties.attend choices several times a day. Each weighed row keeps why a person answered as they did, so a later reader can ask. Most of those rows belong to people the player met only at a door, and the donor meeting and the campaign turn may still read some of them.

**Rules.** Keep what the player's circle reads (CTO Nov 5). No dice. A cut must keep the donor meeting and campaign-turn reads.

**Done when.** A door-only contact's weighed choices are dropped after a day (or never kept) while campaign-turn.test.ts and donor-meeting.test.ts pass on drawn places, and a Montpelier run shows the log under 150,000 rows through year 4.

**Files.** src/core2/trait-decisions.ts,src/core2/choice.ts,src/core2/why-kept.ts,src/core2/decision-detail.ts

**Notes.** State Sessions Nov 6, tried and reverted. (1) Not adding a door answer to focus (state.ts relationship change) broke 6 campaign-day tests: the canvasser reads focus to choose who to reach, so focus must stay. (2) Skipping the weighed record for people whose only tie to the player is a contact (metOnlyAtTheDoor in why-kept.ts, used by keepWeighing and keepChoice) cut the rows from 106,628 to 1,005 at day 100 of year 4, with campaign-day, doors-fold, door-balance and rival-help tests passing, but made campaign-turn.test.ts (a rich rival holds an event; reporters ask) and donor-meeting.test.ts (asks each person in the host's room) fail: those engines read a guest's or voter's kept weighed record. So the record is a read, not only a trace. Next try: keep it one day for a door-only contact (a second drop queue in decision-detail.ts), and prove the donor meeting reads the same day.

Nov 7 (State Sessions): the cut was built and measured, and it does not shorten the year. A list of routine voter choices (parties.attend, conversation.believe-claim, campaigns.retell, campaigns.sign-petition) kept as results only for someone whose sole tie to the player is a contact and who is no kin cut the weighed rows at day 100 of Montpelier's year 4 from 106,628 to 41,904; with take-up-cause, speech-retell, carry-on and speech-keep added as well, a full four-year run (Upper Witter Gulch's twin, same seed, key 5046000) ended with 335,950 log rows against 350,462, and year 4 took 1,696 s against 1,009 s the day before on the same code without the cut (years 1 to 3 were also about 20% slower that day, so the machine was slower, but not by 68%). So the weighed log is not what makes Montpelier's year 4 slow. The change was reverted. The donor-meeting and campaign-turn reds seen with the first try fail on plain main under the same seeds (donor-meeting seed 81aeaba1... Banner Hill TN: no candidate had a host), so they were not caused by the cut. The year-4 profile of Montpelier is the next step.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into core-speed-colorado-election-year-persuasion. Built and measured twice (Nov 6, Nov 7): the cut dropped Montpelier's weighed rows from 106,628 to 41,904 at day 100 but year 4 did not get shorter, so the weighed log is not the cost. Same seed (5a1c0de7a11ce5e1) as the Upper Witter Gulch profile. The kept item now takes the finding that campaign-turn and the donor meeting read a guest's kept weighed record, so any cut must keep it one day.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `core-speed-colorado-election-year-persuasion`, which carries this item's remaining work.
