---
id: core-year-crash-press-staff-absent-person
title: "A played year stops: Absent person in refreshPressStaff fill-in (seed 4e6ca8e5c390e8e9)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/year-crash-press-staff
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:45:06.029Z
---

**What.** A two-level bench world drawn by `drawPlace("4e6ca8e5c390e8e9", "moves-minors")` (the place is printed by `src/core2/moves-minors.test.ts` on the branch of people-minor-left-alone) throws "Absent person: person_16967854b2938e7c" partway through its year, from `updatePerson` (`src/core2/state.ts:1427`) called by `fillInPerson` (`state.ts:1940`) called by `refreshPressStaff` (`src/core2/modules/press.ts:2278`) in `pressWeek` (`press.ts:2311`). The press engine fills in a counted resident as a staffer, and the fill-in finds no person record to update. Find the staffer by record id, say why they are absent (moved away, died, or never admitted), and fix the engine that kept them on the staff list or the fill-in that assumed a record.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix. One model, two tiers: a counted person is filled in only while they are in the counts.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (`buildBenchWorld`, opening 2026-10-12) finishes with no throw, shown by the final date, and the press tests pass. Reproduce first on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Found while taking people-minor-left-alone, where the year crashed before it ended; the crash is the same with and without that change.

Checked 2026-10-16 (claude session) on current main: does not reproduce. `drawPlace("4e6ca8e5c390e8e9", "moves-minors")` (Lazy Mountain, Alaska, place 0243260) runs a full 365-day year in a two-level bench world, both from the game start (2025-01-20 to 2026-01-20) and from the report's opening date (2026-10-12 to 2027-10-12), with no throw. The report's world came from the people-minor-left-alone branch's own test setup, which main does not have; if the crash comes back there, the place and seed above plus that branch's setup are the repro. Closing here; reopen with a seed and a branch.
