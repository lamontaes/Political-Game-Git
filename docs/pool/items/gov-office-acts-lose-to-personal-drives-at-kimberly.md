---
id: gov-office-acts-lose-to-personal-drives-at-kimberly
title: "A played mayor with strong family and contact drives never takes office hours or meetings"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (mayor-acts PR, coordinator's request)"
checked:
---

**What.** At Kimberly, Idaho (drawPlace("mayor-acts-1:4","mayor-acts")), a sitting mayor whose free days are left to the character recorded signing 7, vetoing 6 and one department-head meeting over 20 weeks, and no office hours, town hall, interview or address, even with the due reason on every office act. Seen: that mayor's Journal over a season shows office work as well as family and visits.

**Cause.** Measured: at Kimberly, Idaho, seed from drawPlace("mayor-acts-1:4","mayor-acts") (the pinned test src/bench/mayor-acts.test.ts with that place), the character's own choice scores `contact-known-person` 1.8 to 3.7 and `care-for-relative` about 2.5 every free day, while the office acts, at their most due, score 1.8 to 2.4 (office hours 1.86 on day one, 2.3 later, meetings 1.96 to 2.4); rest scores 0.3 to 0.4. The office acts are offered every day (`officeActProviders`, src/core2/office-day-acts.ts); they lose on score to personal drives whose scale is above the due reason's 0 to 1. Not yet found: which part of the contact and relative drives puts them at 2.5 to 3.7 for this person (src/core2/modules/drives.ts), and whether office duty should weigh more for someone who holds office.

**Fix.** Find what sets those two drives' scores and rank the office duty on the same scale for a person who holds an office, from their traits and office (no dice), so a mayor with a family still gives office hours and meets department heads at the intervals. Prove it at Kimberly and two other drawn places with and without the change.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; an effect is a read, not a record.

**Done when.** A one-year played run of a sitting mayor at Kimberly, Idaho and two other drawn places (names and seeds in the PR) records office hours, department-head meetings and an interview by record id, and a second session plays that mayor and sees them in the Journal.

**Waits on.** The mayor-acts PR merged.

**Files.** src/core2/office-day-acts.ts, src/core2/modules/drives.ts

**Notes.** Found while answering the coordinator on #9277 (Nov 14).
