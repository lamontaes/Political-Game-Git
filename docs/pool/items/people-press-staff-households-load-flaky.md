---
id: people-press-staff-households-load-flaky
title: "press-staff-households.test.ts fails in a parallel run and passes alone on the same seed (Johnstown, Nebraska)"
area: people
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/press-staff-flaky
pr: #4816
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T20:41:46.581Z
---

**What.** `src/core2/press-staff-households.test.ts` (a town outlet's reporters have a household with a home, kin and costs) failed in a parallel run in Johnstown, Nebraska and passed alone on the same seed. The test builds a played world in a drawn place, advances a year, and checks each reporter's cash against a year's pay. Find what differs between the two runs (a leaked global such as `setBookkeeping(false)`, which the test sets and never restores, a shared registry, or the year throwing in a place and seed) and make the test independent of the run around it.

**Rules.** An effect is a read, not a record: the test reads the reporters' households and costs from the world. No dice: the place and seed come from GOLDEN_PATH_SEED and are printed on a failure. Replace, never layer: restore what the test changes rather than adding a guard beside it.

**Done when.** The test passes in a parallel run of `src/core2` and alone on the same seed, with the place and seed named in the failure message, shown by three parallel runs in three drawn places and the test restoring the bookkeeping switch it sets.

**Files.** src/core2/press-staff-households.test.ts, src/core2/press-staff.ts

**Notes.** Looked at 2026-10-16 (claude/press-staff-flaky): three alone runs on seeds jt1, jt2 and jt3 passed, so the original failing run was not reproduced. The test sets `setBookkeeping(false)` and does not restore it, which leaks into any later test file in the same worker. One further candidate for a seed-specific failure: the year includes the press staff pass, which stopped a played year with "Invalid relocation: one living household, no job held" when a person returned to the counts was hired onto a full job (fixed in PR #4665); the original failure message would say which.

Sent back 2026-10-16 from PR #4742 (branch claude/pool-reporter-interview): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
