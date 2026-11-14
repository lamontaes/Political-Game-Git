---
id: tests-whole-past-own-kinds-list-stale
title: "The whole-past test keeps its own stale list of own-past kinds, so a justice record before 2007 reads as the world's history"
area: release
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
checked: Account lead 2026-11-14
source: Account lead T45, Nov 14 2026, red on the clean train 998ba95bf5 and on #9084 alike
---

**What.** `src/core2/whole-past.test.ts` case 6, "the world's own history did not move", fails in Mapleton, Pennsylvania (4247248), WHOLE_SEED=f273f1c135fa76d5: "justice.arrested-before:person_2081d4eb81cb15ba is dated 1961-01-22, before 2007-01-01". A person's own arrest record may be dated before the window; the world's history may not. Seen: no player-visible effect; the test is red on the train whenever the drawn place has a resident arrested before 2007.

**Cause.** Measured: Mapleton PA, seed f273f1c135fa76d5, same message on the clean train 998ba95bf5 and on #9084. Found in code: the test lists own-past kinds by hand (`OWN_KINDS`, whole-past.test.ts line 25: work-spell, out-of-work, moved-in, school.started). The engine's list is `isOwnPastKind` (src/core2/own-past-kinds.ts), which past-justice.ts, past-health.ts and past-moves.ts fill as they load (justice.arrested-before and the others, health.hospital-stay, person.moved-within). The test never learned those kinds.

**Fix.** Replace the test's `OWN_KINDS` with `isOwnPastKind` from own-past-kinds.ts, in both places it is read (lines 200 and 218). Do not loosen the check for the world's own kinds.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Replace, never layer: one list of own-past kinds, the engine's.

**Done when.** A second session runs whole-past.test.ts with WHOLE_SEED=f273f1c135fa76d5 and two seeds it draws, on main, and case 6 passes in each, naming place and seed.

**Waits on.** Nothing.

**Files.** src/core2/whole-past.test.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
