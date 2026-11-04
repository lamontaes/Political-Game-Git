1 of 13 played paths confirmed; 2 wait on the people system. Oldest open PR 0 days (#7233); open: #7233, #7259.

# Lane 4 state: Screens

Owner's word, Nov 4: screens tonight, no people. No new pictures: the art on main only.

## Works

- **Cloud trial, Nov 4:** install, `npm run bench`, New Game with a random place (Long Pine, Nebraska, 3129050) opens its first card with no page errors; screenshot on `trial/lane-4` (`docs/lanes/proof/trial-lane-4/`). `gh` has no valid token in this container (search only); git and the GitHub tools work.
- **Merged, awaiting a second session's replay (Nov 4).** Each line gives the replay; a session that did not build it marks it Verified here.
  - #7194: the families guard's montage line.
  - #7197: election night names a district "District 14", an at-large seat by its state (path 13). Replay: `GOLDEN_PATH_SEED=lane4-results-a` on `src/bench/election-results.test.ts` (Bathgate, North Dakota).
  - #7203: the clerk's race list is one row height at three sizes. Replay: `RACE_SEED=lane4-rows-1 node src/bench/race-list-rows.browser.mjs` (Oakland, South Carolina); `buttons.browser.mjs` ten fresh runs.
  - #7204: election night's governor races on their own page, every row inside the panel at 1024x768 (path 13). Replay: `GOV_SEED=lane4-gov-1 node src/bench/governor-rows.browser.mjs` (Cecilia, Louisiana).
  - #7205: Who you are says why there is no job (path 10). Replay: `GOLDEN_PATH_SEED=lane4-nojob-a` on `src/bench/who-you-are-no-job.test.ts` (Oneonta, New York).
  - #7208: Who you are shows the town's population and this year's moves (path 10). Replay: `GOLDEN_PATH_SEED=lane4-town-a` on `src/bench/town-moves.test.ts`.
  - #7212: loading plays the built world's story: year counter, journal, headlines, map filling in (path 3). Replay: `node src/bench/loading.browser.mjs` (creator: Connecticut, Storrs).
  - #7213: the title shows the monuments on main in their lights; conventions and rallies out (path 1). Replay: `node src/bench/title-monuments.browser.mjs`.
  - #7214: the opening's states part names the governor and the state's chamber leaders over the state's capitol (path 4). Replay: `node src/bench/opening-montage.browser.mjs`; `GOLDEN_PATH_SEED=lane4-open-b` on `montage.test.ts`.
  - #7216: races name their district once, in words ("District 5"). Replay: `RACE_SEED=lane4-rows-1 node src/bench/race-list-rows.browser.mjs` (Oakland, South Carolina).
  - #7100: calendar kinds (meetings, holidays, family birthdays, a key that hides a kind) (path 11).
  - #7231: no menu scrolls at 1440x900 or 1024x768 (path 11). Replay: `MENUS_PLACE="Nebraska|Murray" node src/bench/menus-no-scroll.browser.mjs` (and Storrs, Meadow Lakes).
  - #7232: election night stages the player's own result scene (the concession call) once the returns close, for Lane 3's path 6. Replay: `GOLDEN_PATH_SEED=lane4-night-a` on `src/bench/result-night.test.ts` (Palmer, Iowa).
- **Built, open:**
  - #7233: skills, play-first learns this session's traps (for the CTO).
  - #7238 (merged): the newspaper turns pages; it carries two fit fixes that missed #7231's merge. Replay: `MENUS_PLACE="Delaware|Brookside" node src/bench/menus-no-scroll.browser.mjs` (reads every page).
  - #7241 (merged): main red, kit-only-ui (from my #7231): the Parties roster box comes from the kit. The other two guards red on main (families: executive.ts; english: other lanes' docs) are not Lane 4's.
  - #7242 (merged): main red, families (executive.ts deep import of the filing clerk, from #7164): read through the elections entry. Left for owners: two real place names, one in the Confirmer's Lane 5 proof and one in merge-desk.md line 159, trip the english guard.
  - #7244 (merged): path 3 after the Confirmer's replay: the map says "Storrs", not "Storrs CDP" (loading and Parties); the bar is full when it says Ready. Headlines show only in the last frames, because the paper's archive starts near the start year; earlier years stay without news rather than invented. Replay: `node src/bench/loading.browser.mjs`.
  - #7246 (merged): main red, families again (my #7244 imported `place-lookup.ts`; now through `places.ts`).
  - #7259: path 10 after the Confirmer's replay: Who you are names a school only while you are at one (a 39-year-old in Brookside showed their old school).
- **Path 6 (Clerk and Travel), seen in passing:** in Oakland, South Carolina the filing office's Travel card read "Closed now. Opens Monday, February 2, 2026 at 8:00 AM", and Go opened the counter that morning at 8:00. Not yet replayed in Brookside at night. **Replay for Brookside (Nov 4, corrected):** the filing office has a Travel card only while a race the player may enter is open (owner, Oct 26: "the offices that take the player's filings are their own cards"). In Brookside (replay 4d50e1f88df997f9, player Kaitlyn Moran, 18 on January 23, 2025) the August 30, 2025 special race is not one she may enter; the first that is opens Friday, May 15, 2026 (the November 3, 2026 races, the county board's filed with the county clerk). So the replay is: play on to Saturday, May 16, 2026 (the office shut), open Travel, read the closed card, Go, and the visit plays Monday morning. **Scripted, not yet passing:** `office-hours.browser.mjs` on `lane-4/path6-brookside` pins the town (BENCH_PLACE=1009850) and jumps by the calendar (BENCH_JUMP=2026-05-16), leaving scenes, stops and election mornings as a non-voter. Four runs failed on the way through 16 months of scenes (a stop, an election morning twice, then an advance that never answered); per ruling 6 it goes back, with that branch for whoever takes it. Not blocked.
- **Mock for the owner (through the CTO):** the campaign board, `docs/mocks/2026-11-04/campaign-board.html` and `.png` (path 9): the race with its standing and poll, signatures against needed and the clerk's verdict, the issues the race turns on, an inbox where each item opens its scene, and the team by role (names only until the people system). Building waits on his look; Lane 4 takes the next unit meanwhile.
- **Issues and Budgets (unit 9):** no answer yet on the Nov 1 mocks (`play-first/mocks-issues-budgets`); only shared parts until he answers. The shared fit (#7231) already keeps Issues from scrolling; Budgets runs 13px over at 1024x768 and is left for his answer. `play-law-on-your-record-unreachable` reworks Issues, so it waits too.
- **Agreement 2-4, second part:** the bill draft adapter scope accepted on `lane-2/bill-values` (356db0f4df); Lane 2 makes the edit, named under "Review: Lane 4".
- **Filed for other lanes:** `tests-election-day-no-race-to-enter` and `elections-governor-margins-twice-real` (Lane 1). Mine: `play-town-moves-news-line` (needs Words for the line), `play-opening-home-beat-draws-nobody` (waits on people).
- **Lesson (release):** a declaration id must not already be in `docs/release/consumed-changes.json`; an old pool item's id may be (#7206 renamed mine). Check before naming the file.
- **Agreements:** 3-4 confirmed (fresh news, the Journal, scene pictures; all three already on main). 1-4 confirmed and amended (Lane 1's controls in `src/bench`). 2-4 accepted on `lane-2/opening-home-agreement` (`openHousing` before the first card).

## Gaps that wait on people or new pictures (not blocked)

- Path 1, Title: the latest character in front and passersby wait on the people system; Washington and Jefferson wait on new paintings.
- Path 2, Creator, and path 12, Chamber: the people system.
- Path 4, Opening: the partner's line at home and the household on the couch wait on the people system (home plates); the montage's home beat draws nobody in some towns (`play-opening-home-beat-draws-nobody`).
- Path 9, Campaign board: waits on the owner's look at the mock.

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

**Unit 5: loading** (`screens-loading-worth-watching`)

- **Finish line:** New Game in Storrs shows the journal writing itself, a year counter with headlines, the map filling in.
- **Proof:** `loading.browser.mjs` at three sizes; `loading.test.ts` checks every line and headline by record id.
- **Hands off:** the build's own steps and timings.
- **Known cheats:** a staged screenshot; invented history; a wait added for show.
- **Size:** about 4 hours. **Checked by:** the owner's batch, after a second session's replay.

**Unit 6: title** (`title-screen-national-scene-regression`, rewritten)

- **Finish line:** monuments only, in their lights; conventions and rallies out.
- **Proof:** `title-monuments.browser.mjs` over a full round, three sizes.
- **Hands off:** the character in front and passersby (people); Washington and Jefferson paintings (no new pictures).
- **Known cheats:** one monument repeated; a menu beside the old one.
- **Size:** about 2 hours. **Checked by:** the owner's batch.

**Unit 7: opening** (`opening-governor-key-person`)

- **Finish line:** the governor and chamber leaders named over existing art.
- **Proof:** `montage.test.ts` names the governor by record ids; `opening-montage.browser.mjs` screenshots.
- **Hands off:** drawing anyone new; the address's words (Words).
- **Known cheats:** a person painted into the capitol picture.
- **Size:** about 2 hours. **Checked by:** a second session's replay.

**Unit 8: campaign board** (`screens-campaign-board`), mock first

- **Finish line:** the owner has the mock; building follows his look.
- **Proof:** `docs/mocks/2026-11-04/campaign-board.png`.
- **Hands off:** faces on the team (people).
- **Known cheats:** building before he looks.
- **Size:** 1 hour for the mock. **Checked by:** the owner, through the CTO.

**Unit 2: #7100's two imports** (`play-calendar-more-than-birthdays`)

- **Finish line:** the families guard names nothing in `src/bench/calendar.ts`; the PR says ready.
- **Proof:** the guard's output on the branch with main merged in.
- **Hands off:** the calendar's behavior.
- **Known cheats:** raising a baseline count.
- **Size:** under an hour. **Checked by:** the checker and the merge desk.

## Confirmer

Replays by a session that built none of this lane's work, on main. Only this section is the Confirmer's. Proof: `docs/lanes/proof/confirmer-lane4/` (README per path).

- **Path 1, title: replayed, waits on the owner's look.** Main 705120be1b. White House, Lincoln and the Capitol in six lights at three sizes, no conventions, nothing past the window. Character and passersby wait on people.
- **Path 3, loading, Storrs: replayed, waits on the owner's look.** Main 705120be1b. Inside the window at three sizes, no scroll; year counter, journal lines and counties filling in. Seen: "Storrs CDP" on the map; no headline in the three frames.
- **Path 4, opening, Haleyville: not confirmed.** Main 705120be1b, replay ab5f58e9be125c95. Desk, colonnade, America, Congress, the governor and state leaders named over the capitol, home, Skip scene throughout. The home beat has no partner's line and draws nobody (waits on people, as this page says).
- **Path 5, first evening: fail.** Main fb000259ca, the eight fixed towns. The room matches the house everywhere; Haleyville draws nobody at home, and Storrs and Santa Rita seat someone in a work blazer. Covered by `people-home-plates` and `people-pack-v4-pose-gaps`. Fail 1 of 3.
- **Path 10, who you are, Santa Rita: fail.** Main 705120be1b, replay 6f539fcfdf6d96f9-5, born 1960 (no job). Why ("nobody in your household draws a wage") and the town's size show at three sizes; eight weeks brought no job offer as a scene. Covered by `world-player-jobless-no-offers`. Fail 1 of 3.
- **Path 13, election night, Storrs: pass.** Main 705120be1b, replay storrs-1, New Game, lost Selectman 223 to 552 on November 4, 2025. Four returns pages at 1440×900, 1280×800 and 1024×768: no raw words, both governor rows inside the panel, nothing scrolls. Filed `elections-night-returns-steps-add-up` (a middle page says the rest of the town is in at 2 to 0). Proof: `docs/lanes/proof/confirmer-lane4/election-night/`.
- **Not replayed:** 6 (no filing office in Brookside until filing opens), 7 to 9 (the owner's mocks), 11 (#7231 open), 2 and 12 (people).
