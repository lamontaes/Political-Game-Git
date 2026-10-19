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
source: split from gov-standins-other (Oct 19, 2026); rows SG-GOV-staff-unpaid, SG-GOV-staff-hire-out-of-work, SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant
---

**What.** Officials' automatic hires choose only among people out of work, a staffer hired where no treasury is open is unpaid, and out-of-town relatives are never candidates. Replace these with hiring that draws on employed applicants when the post pays more, ends their old job cleanly, and pays every post from its treasury line. A seat outside the town draws applicants from its own seat of government.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A played year in a drawn place, started with buildBenchWorld, shows the replacement read by another engine by record id, a test in a random place of all 56 names the place and seed, and each row (SG-GOV-staff-unpaid, SG-GOV-staff-hire-out-of-work, SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant) is resolved in src/core2/data/stopgaps.json with the reason.

**Files.** src/core2/modules/staff.ts

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).
