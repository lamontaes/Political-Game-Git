---
id: gov-office-acts-lose-to-personal-drives-at-kimberly
title: "A played mayor with strong family and contact drives never takes office hours or meetings"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: merged
standard: 2
claimed-by:
pr: 9425
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (mayor-acts PR, coordinator's request)"
checked:
---

**What.** At Kimberly, Idaho (drawPlace("mayor-acts-1:4","mayor-acts")), a sitting mayor whose free days are left to the character recorded signing 7, vetoing 6 and one department-head meeting over 20 weeks, and no office hours, town hall, interview or address, even with the due reason on every office act. Seen: that mayor's Journal over a season shows office work as well as family and visits.

**Cause.** Found in code: `act()` in src/core2/office-day-acts.ts binds every office act to goal kind "change-condition" and need "safety". For the Kimberly mayor (seed from drawPlace("mayor-acts-1:4","mayor-acts"), pinned-test route, score breakdown printed from the choice packets) the need term is 0.31 and the goal term 0 for every office act, because holding an office creates no standing goal or need in the person, while `care-for-relative` binds to need "dependents" and goal "care" and reads 1.0 and 1.0 (score 2.49), and `contact-known-person` carries the closeness engine's tie-fading term that grows with hours missed, 0.7 to 1.4 here (SG-P15-closeness-model, `tieMissingWeightPerHour`). An office act's whole pull is its due reason (0 to 1) plus trait, so it tops out near 1.9 to 2.4 against 2.5 to 3.7. The scales differ because duty is not a need or goal in the same engine that reads family and company as needs.

**Fix.** Make holding an office a standing need and goal of the person from the offices engine's term record (the duty of the seat they hold, read by the same need and goal terms the personal acts use), so office acts and personal acts rank on one scale from the person's own record, not by a tuned weight. Prove it at Kimberly and two other drawn places with and without the change, and that personal acts still happen.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; an effect is a read, not a record.

**Done when.** A one-year played run of a sitting mayor at Kimberly, Idaho and two other drawn places (names and seeds in the PR) records office hours, department-head meetings and an interview by record id, and a second session plays that mayor and sees them in the Journal.

**Built.** A need "duty" (content row added by `officeDayData`, evaluator `office-duty` on the office-day module) reads each registered level's kit `duty(api, personId)`: for the local kit the mean of how far office hours and the town hall have come due (days since the holder last gave them over each interval, one if never); zero for anyone without a seat. The local office acts bind to it in place of "safety", so the same need and goal terms every personal act reads rank the seat's work with no weight of its own. The score log at Kimberly showed the second cause: every department head never met was offered at once at full due (score 3.0 against care 2.49), and office hours and interviews were offered every day. Scheduled acts (office hours, interview, each head's meeting) are now offered when their interval has come due, as the town hall and the address already were. The town hall has no reason of its own, being offered only when due. Measured, same seed with and without on the current train, 20 weeks as the played mayor: Kimberly (`mayor-acts-1:4`) office hours 0 to 4, town hall 0 to 1, address 0 to 1, care-for-relative 5 to 6, contact acts 116 to 101; Edmore (`:1`) office hours 8 to 5, meetings 42 to 24, rest 61 to 77; Odessa (`:3`) office hours 9 to 5, meetings 85 to 24, contact acts 36 to 101. Removing every reason of an act's own (tried) lost Kimberly's office hours again, so the other acts keep theirs. Not built: the state and federal kits still bind "safety" (file: gov-state-federal-office-acts-bind-duty-need).

**Waits on.** The mayor-acts PR merged.

**Files.** src/core2/office-day-acts.ts, src/core2/modules/drives.ts

**Notes.** Found while answering the coordinator on #9277 (Nov 14).
