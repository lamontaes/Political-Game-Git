---
id: gov-same-six-speak-at-every-meeting
title: "The same six residents speak, in the same order, at every county board meeting for half a year (Abbs Valley, Virginia)"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Abbs Valley, Virginia, seed 62d329e8-11c0-4bd8-b757-240446436fb0)
---

**What.** On main 596d5127, an Advanced start in Abbs Valley, Virginia (seed 62d329e8-11c0-4bd8-b757-240446436fb0) as Commissioner Beth Hall of the Tazewell County Board of Commissioners, played week by week. Every board meeting from February 4 to August 5, 2025 (Ordinances 2025-2 to 2025-15, twelve meetings) closes with the same panel: "SPOKE FOR · 2 / Sage Malone, Owen Shannon / SPOKE AGAINST · 4 / Dylan Snider, Reese Jordan, Victoria Vance, Ashley Hall". The names come in the same order every time, and nobody else in a county of tens of thousands ever stands up. Seen: the residents who speak at public comment change from meeting to meeting as people's feelings and recent turns at the podium change.

**Cause.** Found in code: `commentSpeakers` (`src/core2/modules/meetings.ts`, line 366) ranks every town adult and counted resident by `standUpDrive` (how strongly they feel about the bill's question, times their civic temperament) and leaves out only those who already spoke on this bill (`already`, from `remarksOn(api, bill.id)`). Each budget ordinance asks the same question, and no speaker's drive changes from one meeting to the next, so `takePart` takes the same top six every time. Having spoken on the same question two weeks before weighs nothing.

**Fix.** A resident's drive to speak is discounted on a sliding scale by how recently they spoke on the same question: `remarks` on that question, by person, scaled by the days since against a new TUNABLE parameter `publicCommentRepeatDays` in the meetings parameter table, with the spread it is checked against. There is no cutoff day. A test plays a drawn place's board through four meetings on one question and checks that the speaker lists are not all the same list.

**Time box.** 2 hours

**Rules.** Sliding scales and causes: the discount slides with the days since the last turn and never flips at a day count. No dice: who speaks is still decided by each person's feeling, temperament and recent turns, never a draw.

**Done when.** The new test passes in two drawn places, and a second session sees, on the bench on main, a drawn Advanced start as a county commissioner played by Week through six meetings, with at least two different speaker lists among them (screenshots with the place and seed).

**Waits on.** Nothing.

**Files.** src/core2/modules/meetings.ts, src/core2/data/ (the meetings parameter table)

**Notes.** P1 and Fable A have already passed "a council passing a budget change at every meeting" to the governing lead. This item is the speakers only.
