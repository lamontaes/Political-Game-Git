---
id: play-needs-play-147
title: "Needs from other sessions listed in play.md (line 147): 30 lines"
area: play
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- GOV and CORE (Oct 12, evening): `src/core2/two-level-elections.test.ts` fails on `opus-core` merged with `opus-gov`, with nothing else added. A state senate challenger gets 0 votes (seeds tle-a, tle-b and tle-c fail 3 of 3; each branch alone passes). Something the core changed since GOV last merged it. The same test
- GOV: on `opus-gov` itself, `recalls.test.ts` and `voting.test.ts` fail, and `src/rules/economy/stopgaps.json` gives `economy.budget-opening-source-proxies` line 533 while the marker in `budget-opening.ts` is at line 541 (`src/rules/economy/stopgaps.test.ts` fails).
- CTO or FIXER: the Windows and Mac desktop packages run out of memory in `npm run typecheck` under `NODE_OPTIONS=--max-old-space-size=4096` (`.github/workflows/desktop-package.yml`). Seen on `opus-play`, `cto/play-merge-2` and `fixer/remove-old-engine`; the same typecheck passes at 4 GB on Linux. The workflow needs a
- **OPUS-GOV: names for budget lines.** Budgets shows lines by their keys (`individualIncomeTax`, `healthAndHospitals`) because the Census finance data (`data/research/money/state-local-finances-2022.json`) and the bill catalog ("Spending: healthAndHospitals") carry no names. Please add each line's name from the Census
- **OPUS-CORE with OPUS-WORLD: seed `playtest-0712` can't open.** It used to hang. On this evening's head it fails after 67 s with "Unsupported collapsed purchase terms: lease:household_402236b51cba9661": the two-level collapse meets a housing lease it doesn't support. Reproduce with `/api/newlife?seed=playtest-0712&da
- **FIXER (old app removal): keep these approved UI pieces for `/play` to port.** From the old app: `src/player/SceneConversation.tsx` (with `ConversationScales`), `scene-conversation.css`, `PersonPortrait.tsx`, `ConversationStrip.tsx`, `kit12.css`, the Kit 13 letterpress block in `controls/controls.css` (lines 377 to
- **FIXER: old modules `/play` still imports** (keep or move before deleting): `src/simulation/dates`, `life-places`, `history-index` and `world`; `src/presentation/backdrop-people`, `place-backdrops`, `dress-code`, `guide-terms` and `appearance-engine/{recipe,pack,runtime,raster}`. There are 25 import lines in all, in
- **OPUS-WORLD: full people's homes have no dwelling record, and none load on the opening day.** In Gadsden, Tennessee (seed home-a), after the first day, the households of all 322 full people (the player's, family's and officials') return nothing from `dwellingKind` or the dwellings table; only counted households have
- **OPUS-GOV with OPUS-PEOPLE: rivals never decide to run.** PEOPLE's `decideToRun` (`src/core2/modules/candidacy.ts:141`) is installed in `/play`, but nothing calls it when a contest opens, so a local race is you against the incumbent (audit 2, "Who runs"). The bench shouldn't call it on its own schedule, which would
- **OPUS-CORE (M7-01, memory): memory grows by about 1.9 GB over a year of `/play`.** Eschbach, Washington (seed year-a, two-level, all 35 modules): 2.3 GB resident after the build, 4.2 GB after one year of Until needed. Earlier, Squaw Lake, Minnesota went from 2.3 GB to 3.4 GB in three months. Worth finding what accum
- **OPUS-PEOPLE and OPUS-WORDS: please run prettier on `src/core2/data/views/ces-2024-views.json` (PEOPLE) and `scripts/english-corpus/shapes/headlines.json` (WORDS) on your branches.** CI now checks the formatting of changed files, and #4002 carried both unformatted, so I formatted them here (whitespace only). Formatt
- **OPUS-CORE (M5-03, keep playing as someone else): the player clock can't hand off after the controlled person dies.** Every clock call, `retirePlayerV1` included, checks that the controlled person is alive (`src/core2/player-v1.ts:210`) and throws "Controlled person is no longer alive; unresolved intentions remain u
- **CTO (art queue):** the title screen should be the Lincoln Memorial or the White House at night (M6 work order). Neither is in `art/backdrops/manifest.json` yet, so the Capitol at night stands in.
- **OPUS-CORE (M6-04): export the custom-world settings step.** Please export `applyOpeningSettings` and `scaleOutsideSales` from `src/core2/tooling/generated-world.ts` (or a `withWorldSettings(input, settings)`), so the bench stops carrying a copy (stopgap SG-PLAY-world-settings-copy). **OPUS-PEOPLE and OPUS-GOV:** `p
- **OPUS-PEOPLE: an opening kin move can be dated after the opening day.** In seed k-a, `person_beefa2d440edc3cd:move:2026-10-31` comes from the kin moves (`src/core2/population.ts:1362`) for a world opening on October 12, 2026. The core's retirement-income step (`src/core2/opening-income.ts:321`) refuses it, so that t
- **OPUS-PEOPLE (news), with OPUS-GOV: world legislating makes play about 5 to 11 times slower after its first session, so the bench leaves it off.** Botsford, Connecticut (seed wl-a, `/play`'s route), re-measured this evening on the same head, one run each: three months took 76 s with `openWorldLegislating`, against 1
- ~~**OPUS-GOV (with OPUS-CORE): filing with a fee crashed.**~~ Fixed on `opus-gov`. In Sterling, Michigan (seed path-check), the 18-year-old filed for council and went on the ballot; a council bill passed 3 to 2 and was vetoed; furthest step 8. `path-check` now lives to the player's own race (November 2, 2027, 15 race
- **OPUS-GOV: the Windows and Mac `package` typecheck fails** on `src/rules/economy/test-support/resource-earned-source.ts`, which imports `tests/fixtures/small-world.ts`, a file the app tsconfig doesn't include (P14 economy). The British-forms failure is fixed: GOV's #4024 allows recorded ward wording, and PEOPLE's jo
- ~~**OPUS-PEOPLE (drives), with OPUS-CORE:** a skip crashed once the player held a drive.~~ Fixed by OPUS-CORE (`ca112abe0`, modules read a projection of the controlled player's needs). Squaw Lake, Minnesota (seed mem-a) now skips three months cleanly. Memory went from 2.3 GB to 3.4 GB over those three months, which i
- **Owner (built the simple version):** the Steam page draft is in `docs/store/steam-page-draft.md`. It needs your price, early-access date and a yes or no on the lead line.
- **OPUS-CORE (custom world, M6-04):** the new-game screen now picks the place. The other settings (demographics, ideology, turnout, party strength, economy) need world generation to take them; a settings object on `buildPopulation` (or the opening) that the bench can pass would let the screen offer them.
- **OPUS-PEOPLE (English engine):** headlines for news stories (`storiesHeard`): each story has only a kind and facts, so News shows "election-result · office: Commissioner · winner: …" until the engine can write the headline.
- **CTO (data):** the map packs in `src/maps/geometry/states/` cover the 50 states and D.C. only. Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands have no geometry, so their players see no map.
- **OPUS-GOV (executive role):** when the mayor, county executive or governor is the played person, `executiveAction` still signs or vetoes from their position. The player should decide: a stop with sign and veto as the choices, or an exported `executiveDecision(api, billId, sign)` that the screen calls.
- **OPUS-GOV (elections in the two-level world):** in Ketchuptown SC (seed all-a), every federal and statewide race went 100% to the incumbent. For example, U.S. Senator was Anthony Hunter 2,542,788 to Victor Medina 0, and every statewide race shows the same 2,542,788 electorate. Only 68 named voters exist in a two-lev
- **OPUS-GOV:** the player's ballot is decided by the engine (`ballotOf` shows a choice the player never made). Election day should be a player stop for the controlled person: offer the ballot (each contest's candidates) as a choice, or export a `castBallot(api, voterId, contestId, candidateId)` that the screen calls b
- **OPUS-GOV:** export a name reader for any candidate id (resident, `official:term:…`, `official:challenger:…`); the bench repeats your private identity draw for challengers (stopgap SG-PLAY-challenger-name).
- **OPUS-GOV:** `scripts/zero-dice-guard.mjs` flags two new list-picks in `src/core2/officials-identity.ts` (lines 65 and 68, names for drawn officials). They look like IDENTITY generation, which needs allowlist entries with a reason.
- **OPUS-CORE + OPUS-WORLD (crash):** in a normal (not two-level) town the clock throws "Payroll arrears lost their actual recorded retry membership." on **2027-03-20**: `ownedRequest` (`src/core2/work-payroll-dispatch.ts:195`), from `dispatchStatus` and `runWorkPayrollDay`, from the player clock's `closeDay`. To repro
- **OPUS-PEOPLE (story director):** an 18-year-old played from Oct 12, 2026 got **no** director moments in eight months (two-level town, seed story-b, through June 4, 2027), and none in five months in a normal town. So no big moment ever stops a skip, and the staged scenes in `/play` (`composeScene`) never play. Is an

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
