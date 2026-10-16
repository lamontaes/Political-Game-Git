---
id: core-year-crash-press-staff-absent-person
title: "A played year stops: Absent person in refreshPressStaff fill-in (seed 4e6ca8e5c390e8e9)"
area: core
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #4781
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A two-level bench world drawn by `drawPlace("4e6ca8e5c390e8e9", "moves-minors")` (the place is printed by `src/core2/moves-minors.test.ts` on the branch of people-minor-left-alone) throws "Absent person: person_16967854b2938e7c" partway through its year, from `updatePerson` (`src/core2/state.ts:1427`) called by `fillInPerson` (`state.ts:1940`) called by `refreshPressStaff` (`src/core2/modules/press.ts:2278`) in `pressWeek` (`press.ts:2311`). The press engine fills in a counted resident as a staffer, and the fill-in finds no person record to update. Find the staffer by record id, say why they are absent (moved away, died, or never admitted), and fix the engine that kept them on the staff list or the fill-in that assumed a record.

**Rules.** One rule, all 56 places: the fix reads data for every place, and the repro place is only a repro. Speed: a town's game year stays under two minutes. Ask why: the failing record is named in the fix. One model, two tiers: a counted person is filled in only while they are in the counts.

**Done when.** In the repro place and a second drawn place (names and seeds in the PR body) a one-year run of the played world (`buildBenchWorld`, opening 2026-10-12) finishes with no throw, shown by the final date, and the press tests pass. Reproduce first on current main; if it no longer throws, close the item with the run's place and seed.

**Files.** src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Found while taking people-minor-left-alone, where the year crashed before it ended; the crash is the same with and without that change.

Sent back 2026-10-16 from PR #4711 (branch claude/year-crash-press-staff): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4781 (branch agy/core-year-crash-press-staff-absent-person): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
