---
id: core2-three-test-files-cannot-load
title: "Three test files cannot load on main: import cycles in counted-moves, group-a-staffing and housing-occupancy"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-core2-three-test-files-cannot-load
pr: #8519
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
claimed-at: 2026-11-11T03:16:25.583Z
---

**What.** The new tests:load sweep (tests-every-test-file-loads) found three test files on main that throw while loading, so every check inside them has stopped running. Each throws a 'before initialization' error caused by two engines importing each other and the test entering them by the wrong door. They were found by the sweep, not by any gate, and must be fixed at the root, never skipped.

**Cause.** Measured: the command node --import tsx scripts/tests-load/load-one.mjs with the absolute path of each failing module, run on main at 4fbc6a18a8, shows it. src/core2/births-counted.test.ts throws 'Cannot access linePayers before initialization' in src/core2/modules/counted-moves.ts; src/core2/budget-line-staffing-year.test.ts throws 'Cannot access staffing before initialization' in src/core2/law-reach/group-a-staffing.ts; src/core2/housing-construction.test.ts throws 'Cannot access NATIONAL_DISASTER before initialization' in src/core2/housing-occupancy.ts. The cycle partner of each is not yet traced.

**Fix.** For each file, import its modules in the file's own order in a fresh process, trace the cycle, and break it at the read the cycle hits (read the table when used, not at the top of the module), as pull request 8243 did for views and campaigns. Then run each fixed test file with two seeds where it draws a place, place and seed named, and the three FAIL lines for these files are gone from npm run tests:load.

**Time box.** 3 hours

**Rules.** Red main comes first: follow .agents/skills/red-main/SKILL.md. Never skip or weaken a test; fix the import order at the root. Ask why: each fix names the import that entered the two engines by the wrong door, by file and line, so the cause is on the pull request.

**Done when.** The three test files load and their tests pass, with each run naming its place and seed where it draws one. A second session on main runs the three test files and sees them pass; this is a check, so no drawn place of the game applies.

**Waits on.** Nothing

**Files.** src/core2/modules/counted-moves.ts, src/core2/law-reach/group-a-staffing.ts, src/core2/housing-occupancy.ts
