---
id: core-press-staff-counted-job-not-resident
title: "refreshPressStaff throws Not in the wider population for a counted job's worker (Bascom, Florida, seed 78df996a2a76eb81378fcb7c5c00238bb398b33a)"
area: core
kind: bug
priority: 1
size: M
status: blocked
claimed-by: claude/press-staff-counted
pr:
blocked-on: words-pack-scene-talk
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:15:58.730Z
---

**What.** In Bascom, Florida with seed 78df996a2a76eb81378fcb7c5c00238bb398b33a, advanceCore throws 'Not in the wider population: person_4f9db9d9b815de95' from fillInPerson (state.ts:1997) called by refreshPressStaff (press.ts, the loop over countedJobsOf(core, outlet.organizationId)) during pressWeek. A counted job names a worker no household in the counts holds and no full person is left to return, so the press week stops the game. Find which step leaves a counted job pointing at a person who has left the counts (a move, a death or a demotion that does not clear the job), and clear or reassign the job at that step rather than catching the error in the press loop.

**Rules.** Find why the counted job outlives its worker (a death, a move or a household returned and renumbered) and fix it where the job is kept, not with a try/catch in press. Wire to the world: prove it in the generated world with the same seed.

**Done when.** GOLDEN_PATH_SEED=78df996a2a76eb81378fcb7c5c00238bb398b33a npx vitest run src/director/electoral-scenes.test.ts (on the words/word-pack head) passes both tests, and a test in src/core2 fails before and passes after on the same seed.

**Files.** src/core2/modules/press.ts,src/core2/state.ts,src/core2/counted-groups.ts

**Notes.** Found Oct 20 while merging main into words/word-pack (PR #4626): the same two electoral-scenes tests failed in Bascom on the merged head. The run takes about 24 minutes. Not shown on a clean main: press.ts and state.ts here match main's.

Oct 20, diagnosis (claude/press-staff-counted): the crash reproduces only on the words/word-pack head (PR #4626, older than main's latest residents.ts and counted-groups.ts), not on current main with the same seed. The failing worker is a husk person whose counted household is already marked Filled and gone (a demoted household whose member index still points at the old, filled record), so `takeResidentHousehold` finds nothing; `refreshPressStaff` calls `fillInPerson` directly on a husk. Merging main into the word-pack branch should clear it; that merge collides on two calibration systems (main's `english-calibration.ts` and `data/english/calibration.json` against the branch's `calibration.ts`), which is the Words session's call. Drop this item once PR #4626 has merged main and `electoral-scenes.test.ts` passes there (Bascom, Florida, seed 78df996a2a76eb81378fcb7c5c00238bb398b33a).
