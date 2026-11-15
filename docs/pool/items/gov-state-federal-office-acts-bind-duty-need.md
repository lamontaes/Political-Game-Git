---
id: gov-state-federal-office-acts-bind-duty-need
title: "A played governor with a waiting vacancy may leave the appointment to personal drives"
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

**What.** The state kit's `governor-appointment` act and the federal kit's `federal-file` still bind need "safety" (src/core2/office-day-state.ts line 1570, src/core2/office-day-federal.ts line 665). Measured, the federal act is taken and the state entries are done; the one case not measured is a played governor with a waiting vacancy (a post whose holder died or that another governor appointed), where `governor-appointment` is offered and might lose to personal drives. Seen: a played governor's Journal over a season holds office work beside family and visits, and the vacancy case has not been staged.

**Cause.** Measured: by the bench player's route (`BenchPlayer.select` on the office-holder, weekly `advance`, `leaveHoldsToCharacter`, as in `src/bench/mayor-acts.test.ts`) at the place drawn by `drawPlace("mayor-acts-1:1", "mayor-acts")` (Edmore, North Dakota; seed key `mayor-acts-1:1`). The governor of North Dakota, 20 weeks, free days left to the character: 14 legislative-leaders entries and 1 appointment done, 4 bills signed, 5 office hours, 1 town hall, 2 interviews, 27 department-head meeting acts, 21 contacts and 77 rests; `liveToday` in `src/core2/office-day-state.ts` acts on every scheduled entry of the controlled person on its day, so entries never compete with personal drives. The state's 12 appointed posts held none waiting (0 appointed by another governor, 0 with a dead holder), so `governor-appointment` was not offered. A played U.S. Representative from the same place over 70 weeks (2025-01-20 to 2026-05-26) took `federal-file` on 2026-02-07 when the window opened (filing `contest:seat:US-ND:us-house:00:2026-11-03`) beside 12 office hours, 3 town halls, 4 interviews, 64 meetings, 108 contacts and 161 rests. The president's duties are day parts.

**Fix.** Stage a vacancy through the game's own path (an appointee's death through the people module's death writer) at Edmore, play the governor 20 weeks with the free days left to the character, and read whether `governor-appointment` is taken. If it is taken, drop this item with the figures; if it loses to personal drives, bind the act to the duty need (`OFFICE_DUTY_NEED`, the local kit's `duty` in `src/core2/office-day-acts.ts`) with a `duty` on the state kit that reads 1 while a vacancy waits, and prove it with and without at the same place.

**Time box.** 2 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; an effect is a read, not a record.

**Done when.** At the drawn place Edmore, North Dakota (`mayor-acts-1:1`, the same draw every run) with an appointee's death staged through the game's own path, a played governor's 20 weeks record whether `governor-appointment` was taken, by record id (the act table row), the item is closed or fixed by that result, and a second session reruns it on main.

**Waits on.** Nothing.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-federal.ts, src/core2/office-day-registry.ts

**Notes.** Found while building the duty need (Nov 15).
