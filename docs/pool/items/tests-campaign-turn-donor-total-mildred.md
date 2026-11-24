---
id: tests-campaign-turn-donor-total-mildred
title: "The campaign-turn donor-total test fails in a drawn Kansas town: a donor gives again after payments are forgotten"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: governing
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** The campaign-turn test (a donor's running total is read from its indexed row) fails on main with GOLDEN_PATH_SEED=5c889114d55002d33b15aaa8fee51c97466951d20e0037d2cda905baa12e207f in Mildred, Kansas (2046500): after every money row is removed, askForDonation gives 2100 instead of 0. Either the donor's total is read from the money rows rather than the gift row, or the test's expectation is wrong for a donor who has room left under their own limit. Found Oct 24 by the traits lead while checking an unrelated press change, with the same failure with and without it. The test lines the item cited have since moved.

**Cause.** Found in code: the test files on its start date, before any race is open. src/core2/campaign-turn.test.ts builds each world at `START` (2026-01-05, line 65) and `twoCandidates` (line 114) files only in `openContests(api)`, which returns contests whose `filingOpens` is past (src/core2/modules/elections.ts line 786). Every contest now has a filing window, and none is open on 2026-01-05 in the draws: measured on main (Nov 11) with GOLDEN_PATH_SEED=5c889114d55002d33b15aaa8fee51c97466951d20e0037d2cda905baa12e207f and the test's own `world` slice, Charlotte Amalie East, U.S. Virgin Islands (20 contests, first window opens 2026-03-20), Turnerville, Wyoming (24, 2026-03-30) and Se'etaga, American Samoa (42, 2026-07-03) had none open and none with a null `filingOpens`. So `worldWithPair` passes over every draw ('no two candidates for the first contest'), and the donor-total case never reaches its donor; the Oct 24 failure on the donor's total cannot be checked until a pair files. The same cause is written into tests-campaign-outside-donors-no-poll. The file's two other reds on Nov 11 ('a rich rival holds an event' in Golden Hills, California, and the stance case) were not traced; read them again after this fix.

**Fix.** Change the test only: in `world` or `worldWithPair`, advance the world to the earliest `filingOpens` among the contests the pair could file in (within a year of `START`, with `advanceCore`), then file as now; log each place passed over with the date its first window opens. Rerun the whole file, and write the two other cases' results into the Notes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: whether a donor gives again follows their gift row and their own reasons. Wire to the world: the gift row is the record the campaign reads. Ask why: the fix names whether the gift row or the test was wrong, by line.

**Done when.** A second session runs the donor-total case in src/core2/campaign-turn.test.ts on that seed in Mildred, Kansas and on two fresh drawn seeds, and sees every run pass. The PR names whether the gift row or the test was wrong, with the file and line, and the donor by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-turn.test.ts

**Notes.** TODO

**Notes (re-run, 2026-11-11, main 79d23fa596).** `GOLDEN_PATH_PLACE_KEY=2046500 GOLDEN_PATH_SEED=5c889114...207f npx vitest run src/core2/campaign-turn.test.ts`: still red, three tests. The donor-total test no longer fails as the item says; it errors: "no drawn town had a named donor: Mildred, Kansas ... no two candidates for the first contest" (the same for Aleneva, Chatham, Eastpointe, Southwest City, Greenfield, Washington, D.C. and San Antonio, Northern Mariana Islands). Also red: 'a rich rival holds an event' (Golden Hills, California): "expected null to be 'event'", and 'a stance is one platform entry per question and every promise keeps its own record'. Still red, on different assertions.

Cause found (Nov 11, 2026, cause finder for Fable B): a probe built the test's world for three of its draws and listed the contests' filing windows; none was open on the start date.
