---
id: release-suite-red-list-core2
title: "Run the src/core2 unit tests (360 files) on main in chunks by file-name prefix and list the red ones with place and seed"
area: release
kind: research
priority: 2
size: M
status: in-pr
claimed-by: claude/suite-red-list-core2
pr: #4985
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T19:32:30.023Z
---

**What.** The `src/core2` unit tests (361 files, 1,830 tests) run on main on Oct 17, six chunks by file name, `--maxWorkers=2` on a 4-core container, one process at a time: 20 tests red, 1,810 green. Twelve of the failures name the drawn place and seed; each test draws its place at random, so rerun a failure with `GOLDEN_PATH_SEED=<seed>` where the test reads it.

**Rules.** List only; fix what is certain in the same pull request; no test is skipped or loosened.

**Done when.** Each red test below passes in its drawn place or has its own pull request, and the real failures among them are told from timeouts (the five that ended with `STACK_TRACE_ERROR` were rerun alone: three timeouts under load, one real failure, one slow test).

**Files.** docs/pool/items/release-suite-red-list-core2.md

**Notes.** Red tests, with the first line of the failure:

- `ballot-dead-candidate.test.ts`: no drawn place had a contest with two named candidates.
- `board-appointer.test.ts`: Pago Pago, American Samoa (seed 5b1ffb9b75d06a9c3ed538afaba3d4c4fff0e850a169e9908527297caa8c7ed9): a count is 0, expected above 0.
- `budget-desk.test.ts`: Samburg, Tennessee (seed df125d61dbb7524a): no stories on the president's act.
- `campaign-turn.test.ts`: St. Francis, Kansas (seed 2aa998c43a0cfc401ab83d1555c9d0e6632f0a7812638b221ee5ca682786d473): a reporter's question is null.
- `consumer-credit-law.test.ts`, `groundwater-law.test.ts`, `paid-leave.test.ts`: `STACK_TRACE_ERROR` with no message; rerun alone they pass, so they were timeouts under two parallel workers.
- `closure-credit-line.test.ts`: fails alone too, on a different draw (seed 2abacff77f16259c82a81d6065d8b0cd): a real failure, no message beyond the stack.
- `property-tax-laws.test.ts`: "Test timed out in 120000ms" alone; the test needs a longer timeout or a faster setup.
- `counted-rent-transfer-read.test.ts`: Vandervoort, Arkansas (seed ef36e3e6bf01216b): no counted rent renewed.
- `counted-weight-headcount.test.ts`: Renwick, Iowa (seed 235ce7a64818f58514d44e4c6a29d045fcc00ca5c2fb927fe99e69acda39e735): 3.19 against a bound of 3.09.
- `electorate-weight.test.ts`: red on main, #4905 has the fix.
- `game-start.test.ts`: Inauguration Day, place 7254688 (seed 9d262868fe5d1b0727d0802505bbf4482dba4c034ad4fe72b): `seat:US:president` has no start date where the test expects 2025-01-20.
- `household-firearms.test.ts`: Van Buren, Arkansas (seed f3bfb1e3436ddb36): a set of 27 people compared with one of 28.
- `housing-opening.test.ts`: Farmer, South Dakota (seed 23c8b9f0d7e70f19f5b297011794f22a): no home houses the played town.
- `office-day-federal.test.ts`: Garapan, Northern Mariana Islands (seed d3de6cf60c285ffe): a seat is undefined.
- `official-salary-payroll.test.ts`: Willow Creek, Alaska (seed 162056d164d81980): `official:seat:US-FL:us-house:11` was paid 7,295,261 where the bound is 164,942.
- `press-turnover.test.ts`: seed fee9899a128dbb43: no press opening was filled in 4 drawn places.
- `service-charges.test.ts`: 4954550 [US-UT] (seed 39299060a55a074b7fe64b7f00322ae524a1beb6599ae9db8731f9b3b5624265): 2,399,097 against a bound of 2,179,673; the carried-arrears change in #4937 targets this cause.
- `vote-level.test.ts`: Cruz Bay, U.S. Virgin Islands (seed 123ea2b0549bc96a3e73ad9a7b70269a36ea6ffa): a chamber organizing is not filed at its own level.

Chunks and their red counts: 8 (62 files), 4 (60), 1 (60), 3 (57), 2 (64), 2 (58). The parts outside `src/core2` are in release-suite-red-list-on-main.

Status of each red test, Oct 17 evening:

- Fixed in a pull request: `ballot-dead-candidate` (#4996), `board-appointer` (#4993), `campaign-turn` (#5002), `counted-rent-transfer-read` (#5006), `counted-weight-headcount` (#4997), `game-start` (#4994), `household-firearms` (#4998), `office-day-federal` (#4995), `official-salary-payroll` (#4989, root cause #4991), the four timeouts `consumer-credit-law`, `groundwater-law`, `paid-leave` and `property-tax-laws` (#4987), and the director test `appointment-scenes` (#5000).
- Already had a pull request: `electorate-weight` (#4905), `housing-opening` (#4883), `world-modules` (#4906), `recall-override-scenes` (#4893).
- Still red, no fix: `budget-desk` and `vote-level` (a national outlet prints none of the federal stories, Samburg, Tennessee seed df125d61dbb7524a and Cruz Bay, U.S. Virgin Islands seed 123ea2b0549bc96a3e73ad9a7b70269a36ea6ffa), `press-turnover` (no press opening filled in four drawn places, seed fee9899a128dbb43), `dev-why` (La Liga, Puerto Rico, seed 4b22c467924caecf), `service-charges` (the carried-arrears change #4937 targets it; not rerun).
- `closure-credit-line` failed alone in the earlier run (seed 2abacff77f16259c82a81d6065d8b0cd) and passes on current main with that seed, so a later change on main fixed it.
- `budget-desk` in Samburg, Tennessee (seed df125d61dbb7524a, 330 days): five national outlets exist and 41 stories on executive actions were printed in the year, but none on the president's act on the federal budget bill, so the test's "a national outlet prints it" fails; the choice of which executive acts an outlet prints is the press engine's, not the budget desk's.
