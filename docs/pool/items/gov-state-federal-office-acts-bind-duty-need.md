---
id: gov-state-federal-office-acts-bind-duty-need
title: "State and federal office acts still borrow the safety need"
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

**What.** The state and federal kits' office acts (src/core2/office-day-state.ts line 1493, src/core2/office-day-federal.ts line 665) bind goal "change-condition" and need "safety", so a played governor or President whose free days are left to the character weighs the office by the same borrowed need the mayor's acts used before the duty need. Seen: that character's Journal over a season shows office work as well as family and visits.

**Cause.** Found in code: the local kit now gives the office-day module's "duty" need its value (`duty` on `OfficeActKit` in src/core2/office-day-registry.ts); the kits in src/core2/office-day-state.ts and src/core2/office-day-federal.ts give none and keep need "safety", so the need term for their acts is the stress read (0.31 at Kimberly), not the seat's work.

**Fix.** Give each kit a `duty` (the share of its scheduled acts come due, from the acts the holder has given, as the local kit's) and bind its acts to OFFICE_DUTY_NEED. Prove it at a drawn state and the federal level in a played year with and without, with the speed check.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; an effect is a read, not a record.

**Done when.** A played governor at one drawn place and a played President, free days left to the character, record their scheduled acts across 20 weeks by record id (names and seeds in the PR), and a second session sees them in the Journal.

**Waits on.** gov-office-acts-lose-to-personal-drives-at-kimberly merged.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-federal.ts, src/core2/office-day-registry.ts

**Notes.** Found while building the duty need (Nov 15).
