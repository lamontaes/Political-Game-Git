---
id: gov-standin-staff-posts-paid
title: "Aides and department heads are paid and hired from the whole labor pool"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant (SG-GOV-staff-unpaid and SG-GOV-staff-hire-out-of-work are resolved on main)
---

**What.** Two of the four staff stopgaps are already resolved on main (SG-GOV-staff-unpaid and SG-GOV-staff-hire-out-of-work: a staffer is paid from a treasury line and hiring can draw on employed applicants). What remains are the staff husk work (SG-WORLD-staff-husk-work) and out-of-town relatives never being candidates (SG-WORLD-staff-seat-applicant): replace them so a seat outside the town draws applicants from its own seat of government and the post's work is real. Read each row in src/core2/data/stopgaps.json before starting.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each remaining row (SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/staff.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
