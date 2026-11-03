# Lane 4: Screens and art (63 items)

**What the player gets.** A monument at dusk with your last character in front and tourists passing. A creator where work clothes, everyday clothes, hair and shoes all fit. A loading screen worth watching. An opening that starts with the President at the desk, cuts across America, names the officials and ends on your real family in your kind of house. Menus that all look like the Government screen. One campaign board. A council chamber with every member seated.

**Finish line: 13 played paths.** Each taste path ends in screenshots at three sizes, no overflow, a batch for your next look.

1. **Title (you can play this).** Start: open the game. See: a monument (Washington, Lincoln, Capitol, Jefferson or White House) in varied light and season, your latest character in front, passersby, no conventions or rallies.
2. **Creator.** Start: New Game. See: work, everyday and formal apart, all fitting a 900-pixel window. Clothes comes from the new people system.
3. **Loading.** Start: New Game, Storrs. See: the journal writing itself, a year counter with headlines, the map filling in.
4. **Opening.** Start: New Game, Haleyville. See: President at the desk, colonnade, America, your governor and chamber leaders named as the camera passes, home with the partner's line, Skip scene.
5. **First evening.** Start: New Game in three towns with different homes. See: your family drawn, the room matching your kind of house, no surprise partner, no work blazers at home.
6. **Clerk and Travel.** Start: Brookside at night. See: closed, visited next morning; the card in words.
7. **Issues.** Start: Politics, Meadow Lakes. See: a law opening as the bill interface for that place, with budget effect, polls and your position; you choose what the list shows.
8. **Budgets.** Start: Politics. See: any state, your county or town, real dates, last year beside this one.
9. **Campaign board.** Start: after filing, Murray. See: standing and polls, signatures against needed, the clerk's verdict, an inbox opening scenes, a team, the issues the race turns on.
10. **Who you are.** Start: jobless, Santa Rita. See: why you have no job, offers arriving as scenes, the town's size.
11. **Menus.** Start: every rail menu at 1440x900 and 1024x768. See: Calendar colored with hideable kinds, Parties explaining itself, no scrolling.
12. **Chamber.** Start: a meeting, Brookside and Meadow Lakes. See: every member in a seat, not faces on a panel. Comes from the new people system.
13. **Election night.** Start: Storrs. See: no raw words, every governor row reachable.

**The work, in order.** At the desk (8 items): `play-offices-keep-their-hours` and others. 8-12 h of checking already counted there.

1. **Title** (no item; `title-screen-national-scene-regression` gets rewritten; about 8-12 h, my estimate). Main has Capitol, White House and Lincoln at night; no Washington or Jefferson paintings were found.
2. **Loading** (no item, about 6-10 h, my estimate).
3. **Opening** (4, about 8 h). `play-m6-01-the-opening`, `play-opening-plays-in-the-talk-box`, `opening-governor-key-person`, `director-opening-as-a-scene`. #7105 and #7061 hold about 5 hours of it.
4. **Issues and Budgets** (4, 13-18 h; mocks on `play-first/mocks-issues-budgets`). `play-issues-law-page-and-what-shows`, `play-budgets-every-government-political-process-style`, `play-prior-budgets-on-screen`, `play-law-on-your-record-unreachable`. Waiting on the owner's answer on the Nov 1 mocks.
5. **Campaign board** (4, about 10 h; mock first). `screens-campaign-board`, `play-filing-petition-on-screen`, `play-issue-stances-on-screen`, `play-campaigns-sheet-speech-pager-races-columns-debate-date`.
6. **Who you are** (2, 2-3 h; a branch saves 1-2). `play-who-you-are-says-why-no-job`, `play-town-moves-on-screen`.
7. **Small fixes** (3, about 3 h). `play-governor-races-on-screen`, `play-stop-race-list-row-heights-differ-when-a-label-wraps`, `results-screen-raw-words`, plus #7100's two imports.
8. **People, wardrobe, seats** (5, not sized). **Being built on the Mac in Blender; no cloud work until the owner says.** `people-pack-v4-pose-gaps`, `people-home-plates`, `people-chamber-plates`, `play-m6-03-art-fixes`, `screens-creator-look-stage-fits-900`. These four were written for the old method and need rewriting.
9. **Room variety** (no item, not sized). Several versions of each place by region and town size, one-camera repaint, frames holding the owner's real family, the textured-menu comparison, rain pictures once Lane 2's weather lands.

**Close 19:** 12 done, such as `play-stop-05`, `play-stop-06` and `people-interview-screen`, and 7 needing a check. Your Oct 25 rule kept some open for your installed-build look; ruling 1 now decides them on a second session's replay. **Drop 5:** a "why they chose" sentence on a card (`play-why-they-chose-on-screen`, your person-card rulings), stripping citations from laws (`play-issues-real-statutes-and-dates`, your "unless it is in law"), the Play buttons, the old every-screen umbrella (`play-m6-02-every-screen-one-at`), old paperwork. **Later 7:** local ads, other states' jobs news, redistricting screen, move-out screen, candidates asking you for money, placeholder art for residences. **Slim 2:** recheck the race list; town size and a news line only. **Ask 2:** answered in section 4.

**Out of scope:** anything to do with the store page (the owner's alone; no session touches it), the Judicial tab until judges exist, the custom world (dev mode).

**Owned files:** `src/bench/`, `src/appearance/`, `art/`, `docs/mocks/`, `src/core2/data/opening/`.

**Handoffs:** Lane 1, `1-4.md`. Lane 2, `2-4.md`. Lane 3, `3-4.md`. Lane 5, `4-5.md`, owner Lane 5: the shared browser helper and the build; check: five browser checks pass in three towns.

**Art limits:** Codex hit its picture limit after 439 pictures on Nov 2. Keep picture jobs in short batches so they don't eat a building lane's allowance.

**Open-work limit:** 3 to 5; 48-hour rule. **Stop rule:** all 13 confirmed and seen by you; the two people-held paths stay open and say so. **Status line:** "0 of 13 played paths confirmed; 2 wait on the people system. Oldest open PR N days."

**First card: the title screen**

- **Finish line:** opening the game shows a monument (Washington, Lincoln, Capitol, Jefferson or White House) in varied light and season, the latest character in front, passersby, and no conventions or rallies.
- **Proof:** screenshots at three sizes across several openings, each naming the monument and the light. Rewrite `title-screen-national-scene-regression` to this. Main has the Capitol, White House and Lincoln at night; no Washington or Jefferson paintings were found, so those need painting.
- **Hands off:** the people themselves (being built on the Mac); never paint a person into a monument.
- **Known cheats:** a menu beside the old one, a staged screenshot, one monument repeated.
- **Size:** about 8-12 hours, an estimate.
- **Save, if stuck, hand-in:** as Lane 1's card, in `docs/lanes/state/lane-4.md`. **Checked by:** the owner, in a built batch.
