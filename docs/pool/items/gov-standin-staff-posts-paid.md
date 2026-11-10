---
id: gov-standin-staff-posts-paid
title: "Aides and department heads are paid and hired from the whole labor pool"
area: gov
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: rc1-world-outside-town
source: split from gov-standins-other (Oct 19, 2026); rows SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant (SG-GOV-staff-unpaid and SG-GOV-staff-hire-out-of-work are resolved on main)
after:
checked: fable 2026-11-10
---

**What.** Two of the four staff stopgaps are already resolved on main (SG-GOV-staff-unpaid and SG-GOV-staff-hire-out-of-work: a staffer is paid from a treasury line and hiring can draw on employed applicants). What remains is the staff husk work (SG-WORLD-staff-husk-work) and out-of-town relatives never being candidates (SG-WORLD-staff-seat-applicant). Replace them so a seat outside the town draws applicants from its own seat of government and the post's work is real. Read each row in src/core2/data/stopgaps/world.json before starting.

**Cause.** Found in code: src/core2/modules/staff.ts has the markers SG-WORLD-staff-husk-work (line 430: a relative living out of town is never an aide candidate) and SG-WORLD-staff-seat-applicant (line 494: one generated applicant for an out-of-town seat), both open in src/core2/data/stopgaps/world.json.

**Fix.** Let a husk with work records (core-every-life-work is done) be an aide candidate, and draw an out-of-town seat's applicants from its own seat of government through the counted population. Resolve both rows with the readers named.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** "An effect is a read": the replacement counts only when another engine reads what it writes at the moment it decides or pays. "No dice": traits, law and money decide, never a roll.

**Done when.** A second session, in a played year in a drawn place started with buildBenchWorld (place and seed named), finds the replacement read by another engine by record id, a test in a random place of all 56 naming the place and seed, and each remaining row (SG-WORLD-staff-husk-work, SG-WORLD-staff-seat-applicant) resolved in src/core2/data/stopgaps/world.json with the reason.

**Waits on.** Nothing.

**Files.** src/core2/modules/staff.ts, src/core2/data/stopgaps/world.json

**Notes.** Split out of gov-standins-other by the session that claimed it (claude/standins-other-credit-business).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have drawn aides' applicants from seats outside the town and made staff work real there; nobody sees it.
