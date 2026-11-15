---
id: gov-duty-need-and-due-reason-count-the-same-duty
title: "The duty need and an act's due reason count the same duty twice"
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
source: "Account lead builder, Nov 15 (duty need PR)"
checked:
---

**What.** With the duty need on, a played mayor at Kimberly, Idaho (drawPlace("mayor-acts-1:4","mayor-acts")) took care-for-relative 2 times in 20 weeks where 13 before, because an office act's score is the duty need and goal plus its own due reason, while care reads the dependents need and goal alone. Seen: the mayor's children at home go unattended for weeks while meetings fill the free days.

**Cause.** Needs cause. Candidate, not yet shown: both the duty need (src/core2/office-day-acts.ts, `duty`) and the act's `office-duty-due` reason read how long since the act was last given, so a due act scores the same duty twice; confirm by printing the score breakdown from the choice packets at Kimberly for care and office hours on a day each wins.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause, then the fix.

**Rules.** No dice; one engine per mechanic; no tuned weight to make one win.

**Done when.** Cause found and recorded; then a one-year run at Kimberly and two other drawn places shows care-for-relative and office acts both on record in the weeks the children need care, and a second session plays that mayor in the running game and sees both in the Journal.

**Waits on.** gov-office-acts-lose-to-personal-drives-at-kimberly merged.

**Files.** src/core2/office-day-acts.ts

**Notes.** Found while building the duty need (Nov 15).
