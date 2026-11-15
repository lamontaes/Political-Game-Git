---
id: gov-state-federal-office-acts-bind-duty-need
title: "State and federal office acts still borrow the safety need"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: dropped
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

**Cause.** Measured: it is not a defect, by the bench player's route (`BenchPlayer.select` on the office-holder, weekly `advance`, `leaveHoldsToCharacter`, as in `src/bench/mayor-acts.test.ts`) at the place drawn by `drawPlace("mayor-acts-1:1", "mayor-acts")`, seed key `mayor-acts-1:1`. At Edmore, North Dakota, a played governor with free days left to the character did 7 of 7 scheduled state entries in 20 weeks (1 budget proposal, 6 legislative-leaders) because `liveToday` in `src/core2/office-day-state.ts` acts on every entry of the controlled person on its day, so those never compete with personal drives; the same weeks gave 5 office hours, 1 town hall, 2 interviews and 8 department-head meetings (the local kit's duty need reaches governors) beside 28 contacts and 74 rests. A played U.S. Representative from the same place over 70 weeks (2025-01-20 to 2026-05-26), floor votes left to the character, took `federal-file` on 2026-02-07 when the filing window opened (filing `contest:seat:US-ND:us-house:00:2026-11-03`), with 12 office hours, 3 town halls, 4 interviews, 64 department-head meetings, 108 contacts and 161 rests. The president's duties are day parts. The only choice acts of the state and federal kits are `governor-appointment` (offered only while a vacancy waits; none arose at Edmore, so unmeasured) and `federal-file` (taken).

**Fix.** None: dropped as not a defect on the measurement above. Reopen if a played governor is seen to leave a waiting vacancy unfilled while free days go to personal acts.

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; an effect is a read, not a record.

**Done when.** Nothing to build. A drawn place's played governor leaving a vacancy to the character shows the `governor-appointment` act taken or lost, by record id, in a second session's replay.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-federal.ts, src/core2/office-day-registry.ts

**Notes.** Found while building the duty need (Nov 15).
