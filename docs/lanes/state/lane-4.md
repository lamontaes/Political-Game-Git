0 of 13 played paths confirmed; 2 wait on the people system. Oldest open PR 3 days (#7100); open: #7100, #7204, #7205.

# Lane 4 state: Screens

Owner's word, Nov 4: screens tonight, no people. No new pictures: the art on main only.

## Works

- **Cloud trial, Nov 4:** install, `npm run bench`, New Game with a random place (Long Pine, Nebraska, 3129050) opens its first card with no page errors; screenshot on `trial/lane-4` (`docs/lanes/proof/trial-lane-4/`). `gh` has no valid token in this container (search only); git and the GitHub tools work.
- **Merged, awaiting a second session's replay (Nov 4):**
  - #7194: the families guard's montage line.
  - #7197: election night names a district "District 14" and an at-large seat by its state (path 13).
  - #7203: the clerk's race list is one row height at three sizes; `race-list-rows.browser.mjs` and the buttons check's travel drive.
- **Built, open:**
  - #7100: calendar kinds; the two families imports fixed, said ready.
  - #7204: election night's governor races on their own page, every row inside the panel at 1024x768 (path 13). Replay: `GOV_SEED=lane4-gov-1 node src/bench/governor-rows.browser.mjs` (Cecilia, Louisiana).
  - #7205: Who you are says why there is no job (path 10). Replay: `GOLDEN_PATH_SEED=lane4-nojob-a` on `who-you-are-no-job.test.ts` (Oneonta, New York).
- **Filed for other lanes:** `tests-election-day-no-race-to-enter` and `elections-governor-margins-twice-real` (Lane 1). Mine: `play-filing-race-label-district-code`.
- **Agreements:** 1-4 confirmed and amended (Lane 1's controls in `src/bench`). 2-4 accepted on `lane-2/opening-home-agreement` (`openHousing` before the first card).

## Gaps that wait on people or new pictures (not blocked)

- Path 1, Title: the latest character in front and passersby wait on the people system; Washington and Jefferson wait on new paintings.
- Path 2, Creator, and path 12, Chamber: the people system.
- Path 4, Opening: the President at the desk and the colonnade need art main does not have.

## Unit cards

**Unit 1: agreements**

- **Finish line:** 1-4 confirmed or amended by Lane 4; Lane 2's 2-4 proposal answered.
- **Proof:** the two files, each checked against the code it names.
- **Hands off:** Lane 2's housing code; Lane 1's elections code.
- **Known cheats:** accepting a call that does not exist.
- **Size:** under an hour. **Checked by:** Lanes 1 and 2.

**Unit 3: small fixes** (`results-screen-raw-words`, `play-stop-race-list-row-heights-differ-when-a-label-wraps`, `play-governor-races-on-screen`)

- **Finish line:** no raw key on election night; race rows one height; every governor row reachable at 1024x768.
- **Proof:** the three PRs' checks and screenshots at three sizes.
- **Hands off:** the voting engine's numbers (margins filed for Lane 1).
- **Known cheats:** a staged screenshot; a second results screen.
- **Size:** about 3 hours. **Checked by:** a second session's replay.

**Unit 4: who you are** (`play-who-you-are-says-why-no-job`; `play-town-moves-on-screen` next)

- **Finish line:** a jobless grown player reads why, from the household's records; the town's size and moves on screen.
- **Proof:** the test's place and record ids; screenshots at three sizes.
- **Hands off:** the jobs engine; job offers as scenes stay Lane 3's.
- **Known cheats:** a reason typed in code; a reason not read from a record.
- **Size:** about 3 hours. **Checked by:** a second session's replay.

**Unit 2: #7100's two imports** (`play-calendar-more-than-birthdays`)

- **Finish line:** the families guard names nothing in `src/bench/calendar.ts`; the PR says ready.
- **Proof:** the guard's output on the branch with main merged in.
- **Hands off:** the calendar's behavior.
- **Known cheats:** raising a baseline count.
- **Size:** under an hour. **Checked by:** the checker and the merge desk.
