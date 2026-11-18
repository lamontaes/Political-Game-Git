# The train's tests, run once: 405 of 462 files pass

The Account lead's train merged into main on November 15, 2026, on the owner's word. Before it merged, the acting CTO ran every test file the train changed, once, on its frozen head. 405 files passed, 56 failed and one gave no result. Nothing in the failures shows the game crashing in play, but some scenes may no longer come up where they used to. This page lists every failing file so the thread that built each test can take it.

## The numbers

| What                   | Count |
| ---------------------- | ----- |
| Test files run         | 462   |
| Files that passed      | 405   |
| Files that failed      | 56    |
| Files with no result   | 1     |
| Tests run              | 1,826 |
| Tests that passed      | 1,717 |
| Tests that failed      | 75    |
| Tests that are skipped | 34    |

The checks on the game as a whole were green on the same head: the golden path, the played year, a new game, the Mac and Windows packages, the speed pair, typecheck, the 20 guards and the dice check.

The 34 skipped tests are in four files. The housing law test skips 27: two of its three pinned places are off unless a switch is set, and one case is skipped with an open item. The budget-line test skips five at Fort Carson, Colorado. The incumbent-response test and the concession test skip one each.

## Why these were not seen before

Each pull request ran its own changed tests when it was folded into the train. Tests from earlier folds were not run again when later folds changed the world under them. The check that would have run them all, the test job GitHub requires, stops at 45 minutes and never finished on a change this large.

## Already on the Account lead's known list (5 files)

- `src/core2/housing-ready-at-opening.test.ts`: 45 households open without a home row.
- `src/core2/law-wiring-government.test.ts`: a ward charter place, attempt 4, no registrations paid or owed by the county.
- `src/core2/law-wiring-prices.test.ts`: no drawn place had a builder start a project in 760 days under the gas hookup ban.
- `src/director/celebration-gathering-scene.test.ts`: the celebration ask has 72 lines against a limit of 45.
- `src/director/interview-sitting-words.test.ts`: a brief answer reads "Then your record will have to speak" where the test expects "No comment, then."

## Cleared by taking the filing fee out (1 file, confirmed)

- `src/core2/campaign-real-race-played.test.ts`, Bennington, Kansas: the player could file for no council race. It passes on main now that the fee is removed. `src/bench/campaign-mail.test.ts` ("nobody could file", Shaniko, Oregon) and `src/bench/election-day.test.ts` may be the same; run them again on main.

## Fixed checks that fail every time (10 files)

- `scripts/dialogue-batch/liked-lines-kept.test.ts`: five lines the owner graded good are in no bank: two meeting lines ("I rise to speak briefly in gratitude today", "reserving the right to object"), the farewell "Take care of yourself", and the two scene-talk lines built on the meeting lines.
- `src/english/bill-sections.test.ts`: the fee subjects a bill can set (park and recreation fees and the others) have no words row, so a bill on them has no section words.
- `tests/english-answerable-asks.test.ts`: six asking lines have no answer from a record beyond the baseline.
- `src/english/most-specific-line-wins.test.ts`: one line in the shipped scene-talk bank is not the most specific one that fits.
- `src/core2/outcome-web-labor-waiting.test.ts` (9 tests): two folds disagree. The data names `SG-WEB-unread-labor-*` where the test expects `SG-LABOR-person-exposure` and `SG-LABOR-unsized-links`, and two engine files now read what the test says nothing reads.
- `scripts/zero-dice-guard.test.ts`: four allowlist entries hold more lines of a kind than main held before the merge. Run it again now that the train is main.
- `src/core2/recalls.test.ts`: the test builds its own partial world without the office day's settings or the speech engine, which the office day now needs. The game's own world has both. The test should build its world the way the game does.
- `src/core2/housing-property-tax.test.ts`: the county's cash is $6,000 over what the test expects, because the engine now bills property tax by itself during the year the test plays.
- `src/core2/law-reach/school-aid.test.ts`: "expected 15097987 to be less than 200".
- `src/core2/day-zero.test.ts`, Washington, District of Columbia: two tables are empty on day 0 and not marked as known.

## Pinned places where the scene or case no longer comes up (23 files)

Each of these names its place and seed in its own failure line.

- `src/director/conversation-said.test.ts`: Olla, Louisiana.
- `src/director/home-talk-own-race-only.test.ts`: Sherrodsville.
- `src/director/office-hours-reply-case.test.ts` (3 tests): Taylors, South Carolina; Kandiyohi, Minnesota; Donnelly, Idaho. The case's reply id is missing.
- `src/core2/staff-hire-employed.test.ts`: Agugulu, American Samoa.
- `src/director/concession-reported.test.ts` (2 tests): North Westminster, Vermont. The race named no winner.
- `src/director/political-asks.test.ts` (2 tests): Adams, Massachusetts, no accusation scene; Rainelle, West Virginia, no advice scene.
- `src/core2/party-mentor.test.ts`: Denver, Pennsylvania.
- `src/core2/rival-campaign-day-played.test.ts`: Kirby, Wyoming.
- `src/core2/modules/constituent-cases-warmth.test.ts`: Rock Ridge, Connecticut.
- `src/bench/printed-police-log.test.ts`: Surrency, Georgia.
- `src/director/justice-talk.test.ts`: Perkins, Georgia.
- `src/director/speech-occasion-read.test.ts`: Wilmington Manor, Delaware.
- `src/core2/second-chamber-own-day.test.ts` and `src/director/hearing-witness.test.ts`: Ciales, Puerto Rico.
- `src/bench/endorsement-played.test.ts` (2 tests): North Courtland, Alabama; Laurel, Montana.
- `src/director/eviction-leads-the-talk.test.ts`: Faleasao, American Samoa.
- `src/core2/candidate-platform-spread.test.ts`: Marshfield, Massachusetts.
- `src/bench/election-notice-printed.test.ts`: the notice does not name the County Commissioner race.
- `src/bench/campaign-team.test.ts`: Hyde Park, Pennsylvania.
- `src/director/study-committee-scenes.test.ts`: Jessup, Pennsylvania.
- `src/director/bill-sign-on.test.ts`: Wilmont, Minnesota.
- `src/director/view-learned.test.ts`: seed 7e4e7180c987d9b34da9.
- `src/director/conversation-home-lines.test.ts`: Gascoyne, North Dakota.

## Drawn places, where this run's draw did not hold the case (15 files)

A second run draws other places. Each is still a test that can go red by draw, which the pinned-tests skill says to fix by pinning.

- `src/director/bring-it-up-election.test.ts`: Astoria, Oregon.
- `src/director/speech-afterward.test.ts`: Felsenthal, Arkansas.
- `src/bench/campaign-mail.test.ts` (2 tests): Shaniko, Oregon.
- `src/bench/filing-visit-talk.test.ts`: Volcano, Hawaii.
- `src/core2/budget-line-staffing.test.ts`: Summerlin South, Nevada.
- `src/core2/campaign-day.test.ts`: Franklinton, Louisiana.
- `src/core2/congress-budget-line-bill.test.ts`: no vote enacted in eight places.
- `src/bench/election-day.test.ts`: no draw reached election day.
- `src/director/asked-mutual-give-back.test.ts`: Cumming, Iowa.
- `src/core2/budget-line-schools-staffing.test.ts` (2 tests): no drawn place had the pieces; Fremont, Iowa.
- `src/core2/office-day-attend.test.ts`: Bondurant, Wyoming.
- `src/core2/officials-sample-vacancy.test.ts`: no such official died in the year.
- `src/core2/past-work.test.ts`: Walkerville, Michigan.
- `src/core2/prices-web.test.ts`: Arcanum, Ohio.
- `src/bench/bill-override-federal.test.ts`: no drawn place vetoed a bill the player could override.

## Ran out of time (2 files, and 1 with no result)

- `src/bench/dev-scene.test.ts` (2 tests), Cheyenne, Wyoming: the file took 1,154 seconds.
- `src/core2/counted-moves-fit-once.test.ts`: the file took 3,101 seconds.
- `src/core2/campaign-platform-played.test.ts`: no result.

## How it was run

The frozen head was 892427ec15198d1bedcf8b7b8e4de0c7d8956264 and main before the merge was fa34439db86808e0f2b62ccae52607c13f8feb81. The list is every changed or added test file between them, sorted, split into five parts by line number. Four parts ran in checker sessions in their own cloud containers and one in the acting CTO's, each with `npx vitest run --maxWorkers=3` and no seed set, so drawn tests drew as they do on GitHub. Each file ran once and nothing was run again to turn a fail into a pass. The sorting into groups above is the acting CTO's reading of the names, seeds and messages; no failing file was run a second time to confirm its group.
