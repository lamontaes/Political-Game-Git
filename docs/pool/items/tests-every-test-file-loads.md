---
id: tests-every-test-file-loads
title: "A check fails when any test file cannot load or holds no test, and names the file"
area: release
kind: feature
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/pool-tests-every-test-file-loads
pr:
after:
blocked-on:
lead: cto
model: sonnet
effort: medium
root: design-guards
source: CTO, Nov 10, 2026, after three test files on main were found not loading
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:12:26.325Z
branch: claude/pool-tests-every-test-file-loads
---

**What.** Three test files on main could not load, so every check inside them silently stopped running: the journal's opening test (fixed in pull request 8227), the officials and president import cycle (8173) and the election law test (8243). Each was found by chance, days or weeks later. A file that cannot load must turn main red within the hour and name itself.

**Cause.** Found in code: the test step of .github/workflows/validate.yml (the step "Run only the changed test files", near line 209) runs only the test files a change touched, and the local gate does the same, so no job ever loads the other 1,380 test files. A source change that breaks how a test file loads is therefore never seen until someone runs that file. In all three cases the break was the order of imports: two engines import each other, and a test whose first import enters them by the wrong door meets a table that is not yet set (for the election law test, `registerStanceListener` in src/core2/modules/views.ts and `NATIONAL_ENGAGEMENT` in src/core2/electorate.ts).

**Fix.** Add scripts/tests-load/check.ts and `npm run tests:load`. For every tracked test file (`*.test.ts`, `*.test.tsx`, `*.test.mjs`, `*.node-test.ts`, leaving out tests/e2e, tests/caller-proofs, desktop and art/authoring as the workflow does) it reads the file's own import lines in order and, in a fresh process, imports those modules in that order without running the test file's body. Many test files build a world at the top of the file, so loading the test file itself would cost hours; its imports cost seconds. Files with the same ordered import list are loaded once. It runs four at a time, prints each file that throws with the first line of its error, and exits 1 if any did. It also fails a test file that holds no `it(` or `test(` call. It loads every command in docs/roadmap/features.json the same way: each command's script is imported in a fresh process with its world-building stopped before the first run (an environment switch the script reads, `POOL_LOAD_ONLY=1`, added to the shared runner the scripts start from), because a golden-path command that cannot load reads as a regression on every pull request. Measure the whole sweep on a 4-core machine first. If it takes under five minutes, add it as tests/guards/test-files-load.test.ts so every gate runs it; if not, add it as a step of the hourly run of validate.yml on main. Either way add its line to `.agents/rules/repository-reference.md`.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Ask why: every failure the check prints names the file and the first line of its error, so the cause can be followed without a rerun. One rule, all 56 places: the check loads every test file the same way and names no file or engine in its code. Red main comes first: a file that cannot load is a red, and this check is how it is seen. Keep it simple: one script and one place it runs, with no new service. Never weaken a test: the check adds no skip list beyond the folders the workflow already leaves out, and a file that fails is fixed or filed, never excused. Follow .agents/skills/red-main/SKILL.md for what a red found by this check becomes.

**Done when.** A second session, on main, runs `npm run tests:load` and reads a pass with the count of test files checked and the seconds it took. It then breaks one import on a scratch branch (it puts back the top-level read of a table across the views and campaign engines that pull request 8243 removed), runs the check again, and reads a failure that names src/core2/elections-law.test.ts. This is a check, so there is no drawn place to play; the test of the check is that break.

**Waits on.** Nothing.

**Files.** scripts/tests-load/check.ts (new), tests/guards/test-files-load.test.ts (new), .github/workflows/validate.yml, package.json, .agents/rules/repository-reference.md

**Notes (Fable, Nov 10, a fourth case).** The national economy command (src/core2/tooling/m1-02-check.ts) could not load on main after pull request 8231: src/core2/modules/grievance.ts read an event's name from the housing engine while it was half loaded. Fixed in pull request 8246. It was a command, not a test file, so the golden-path commands are now part of this check.

**Notes.** Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:12 UTC) on branch claude/pool-tests-every-test-file-loads.
