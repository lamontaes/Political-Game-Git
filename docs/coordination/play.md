# OPUS-PLAY: What you play

Only OPUS-PLAY writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The bench, the game screens on the new core, the nightly integration build, store screenshots.
- **Branch:** opus-play (from pool/M0-bench).
- **Model:** Opus, medium: screens and integration on agreed designs.
- **Starts from:** The bench (#3940, branch pool/M0-bench), including the bench fixes that never started.

## Tonight's build (Oct 12)

Branch `opus-play` (draft PR #4002). Open a Codespace, run `npm run bench`, and open port 3000 **at `/play`** for the game screen. The plain page at `/` is the developer bench, with every record and "why".

**Start here: `/play`.** Press **New life**. First comes the opening: the President, your senators, your representative, your governor, your legislators and your town's officials, each in their own room, then your family, then you (Escape skips it). You start as the resident at or nearest 18 in a random town anywhere in the 56 places, at home with your family, in the approved Kit 12/13 look. Your card at bottom left has the clock and Day, Week and Until needed. Choices appear along the bottom. Click anyone in the picture to talk; the conversation runs across the bottom with the scales (Lie) in its corner. **Calendar** (top left) shows the next two months: the November 3 general election, filing deadlines, laws taking effect and family birthdays. **News** lists public records as the world makes them. **Politics** shows who holds every seat over you and the contests you could file for, with File and Request signatures. **Journal** is your life so far. People, Who you are, Money and property, and Jobs and study are at bottom right.

**What you can do tonight**

- In `/play` the town is full size (the whole place, about 10,000 people), with only your circle and the officials followed one by one. Building it takes about a minute. The developer bench at `/` still has a town-size field.
- Click anyone to see their record, household, job, relationships, money and story moments. Viewing changes nothing.
- Press **Play this resident** to take someone over. Move time by Day, Week or a calendar date, and pick from the choices the game offers.
- Press **Skip until needed**. Your character makes its own choices (the list under "Chosen by the character while you skipped" shows them) and the skip stops at your next shift, a big story moment or a deadline.
- Switch to someone else at any time. The person you leave finishes their day on their own.
- Click any saved record to see why it happened.
- **See where they are.** Viewing or playing someone shows a picture: their home with their household, their workplace with their coworkers (a diner, a newsroom, a classroom, chosen from their employer and job), or the place an act takes them, lit for the time of day. People are drawn by the people engine on each picture's marked spots.

- **Talk to people.** Anyone in the picture with you has a Talk button. They open with something real ("Are you still living in East Thermopolis?"), and your choices answer and raise real subjects. **Lie** lights up only when there's something about your own life you could lie about, and the lie is remembered. **Leave** ends it.
- **Read "My life".** The journal shows your character's life as chapters: their schools, their children, their jobs.
- **See your government.** The Government panel shows the law where you live (minimum wage, taxes, SNAP, unemployment, Medicaid), who holds every seat over you, from the president to the city council, and the next elections with their filing deadlines and the office that takes filings.
- **File for office.** Pick a contest, press File (tick payFee to pay the fee instead of gathering signatures), then Request signatures to ask the people you know. Each person decides for themselves.
- The golden-path panel now shows step 3 (filing) reachable and the national economy running.

**What changed today**

- The whole world runs in the bench town: people, families, drives, health and the story director (OPUS-PEOPLE), the national and regional economy, jobs, the bank and housing (OPUS-WORLD), and law, offices and elections (OPUS-GOV).
- Switching residents works, and skipping no longer stops at every small choice or at the end of each shift.
- The 25 new place pictures (county clerk offices, registrar, election warehouse, rallies, the convention, homes, schools) have their standing and seating spots.

**Not in yet:** campaigning, election night and everything after them (OPUS-GOV). Filing and talking happen instantly for now; they don't spend the day's hours yet. Every home shows the same house interior until homes record what kind of dwelling they are. Children aren't drawn, because the people art is adults only.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **The bench on the full stack.** Done Oct 12: people, drives, health and the director in the bench; switching residents fixed; the character chooses while you skip; the director stops the skip at a moment's own time. M0-01 to M0-05 are golden-path commands (`src/bench/m0-check.ts`) and pass in drawn places (15 of 15 runs by hand, 5 of 5 under the runner).
  - Was: Bring in people, drives and the story director; fix switching residents; while you skip, your character chooses for itself; big moments stop the skip at their own time.
  - Verified by: M0-01 to M0-05 in random places; you play it.
  - Needs: PEOPLE, CORE
- [ ] **Use the art we already have (owner, Oct 12).** Wire the tagged art library into every scene and screen now:
  - backdrops by their tags in `art/backdrops/manifest.json`;
  - people from `art/people-engine/v1` (poses, outfits, expressions);
  - capitols and campuses.
  - First: merge `origin/art/places-batch2` (draft PR #3994, 25 new places: county clerk offices, a registrar, an election warehouse, rally sites, the convention, homes, schools) into your branch, and add their staging spots (where people stand and sit) to `art/backdrops/staging.json` by looking at each picture. Follow the rules in `src/presentation/backdrop-anchors.test.ts`. Say in your status file when it's green so the CTO can merge #3994.
    Pick the best-tagged match for each place and moment (a generic government office for a county clerk is fine). Never wait for a perfect painting. Note any place with no fitting art under "Needs from other sessions" for the CTO's art queue.
  - Verified by: In a random place, every scene you reach shows real art from the library, and none shows a blank or placeholder image.
  - Needs: CTO (imports of generated art not yet in the repo)
- [ ] **A build you play every evening.** Each evening, one build with a short note: what you can do tonight and what changed.
  - Verified by: You play it.
  - Needs: All
- [ ] **Screens for each golden path step.** In progress (Oct 12): day and skip, the place picture, the conversation box with the Lie button, the journal, law here, who governs you and filing are in the bench, all reading engine records. Next: a person card, then campaigning and election night as GOV lands them.
  - Was: Person card, day and skip, conversation box with the Lie button, journal, then the filing office, campaigning and election night as GOV lands them; record data and control names only, engine text only.
  - Verified by: Browser checks of each screen, then you play it.
  - Needs: GOV
- [ ] **Store page screenshots.** In progress (Oct 12): `src/bench/store-shots.mjs` captures 1920x1080 shots of real play from `/play` in any towns. The first 16, from four towns (home, a day in, a conversation, politics), are sent to you in the session. Before Friday: English names on the choice buttons (OPUS-PEOPLE) and the capsule art (CTO).
  - Was: Real gameplay screenshots for the Steam page by Friday, with capsule art from the art pipeline.
  - Verified by: Your sign-off.
  - Needs: CTO (art)
- [ ] **The opening.** First version in `/play` (Oct 12): after New life, the camera cuts from the President in the Oval Office at night to your senators, your representative, your governor, your state legislators and your town's officials, then your family at home, then you. Each shot draws the real holders from the offices records, dressed for the place, with their title and name. Escape skips it. Waiting on the speech's words (OPUS-PEOPLE); stopgap SG-PLAY-opening-without-speech.
  - Was: Your opening sequence, from the place's officials and family, with engine words.
  - Verified by: M6-01.
  - Needs: GOV, PEOPLE

## Needs from other sessions

- **OPUS-CORE (two-level world):** two things on the merged stack.
  - `collapseToTwoLevels(input)` with the default keep fails in `createCore` ("Absent family member"). PEOPLE's kin gives full people relatives in other households, and the core requires every relative of a full person to be full. The bench keeps the family closure for now (`familyClosure` in `src/bench/world.ts`, about 260 to 360 full people in a 10,000-person town). Either the closure belongs in `fullPeople`, or relatives in the counts should be allowed as husks.
  - WORLD's central-bank board (`withCentralBank`) must stay full people. The bench keeps everyone a module adds at the opening; `fullPeople` could do the same.

- **OPUS-GOV:** on the merged stack, `src/core2/modules/offices.ts` lines 419, 434 and 588 fail typecheck: a module table row now casts to `TermRow` only through `unknown` (`as unknown as TermRow`). The game runs; the repo typecheck is red there. (I wrongly reported this fixed earlier.)

- **OPUS-GOV:** voting. A new game starting Oct 12, 2026 has the general election on Nov 3, three weeks in, and the player is 18. If the elections module offers the ballot (contests, candidates on it) and a cast-vote call, the play screen will show the ballot on election day and record the vote.

- **OPUS-PEOPLE (English engine):** the opening speech. The President's address (inaugural in an inauguration year, else the State of the Union) with the world's real numbers, one passage per level so it plays over each shot: national, your senators and representative, your governor and state, your town, your family. The shots are ready in `/play` (`src/bench/opening.ts`).

- **OPUS-GOV:** in Gunnison CO (seed gov-a), the President and Vice President are Linda Franklin and Robert Franklin, so fictional national pairs can share a family name. A U.S. Senate filing there went straight onto the ballot with a fee of 0 and no signatures; Colorado's major-party route is petition or assembly.
- **OPUS-GOV / OPUS-PEOPLE:** filing, signatures and conversations happen instantly from the bench. They should be acts that spend the day's hours: going to the filing office, walking a petition, sitting down to talk. When an act exists for each, the bench will offer it through the clock instead.
- **OPUS-PEOPLE:** conversations can offer 19 choices at once (every relative the other hasn't met), which fills the screen; the play screen shows the first 6. Could the engine offer four to six, as your log says?
- **OPUS-PEOPLE (English engine):** names for the choices the clock offers. The play screen shows the act's record id and its target ("contact-known-person · Jason O'Neal") until the engine can say it.
- **OPUS-GOV:** party labels mix "Democrat" and "Democratic" (U.S. Representative "Democrat", state seats "Democratic").
- **OPUS-PEOPLE:** in a conversation with a housemate, the player asks "Have you met my father, Justin?" about family in the same town. Worth checking whether housemates count as having met each other's family.

- **CTO (art queue):** people art for children and teenagers. The people engine draws adults only, so children at home are left out of scenes; a player who turns 18 has younger siblings who never appear.
- **OPUS-PEOPLE:** looks aren't shared within a family. In one bench household the parents and child were drawn with unrelated skin shades, because each person's looks come from their own seed. Could family members' recorded looks (`looks` on the person) carry the family's shade and hair?
- **OPUS-WORLD or OPUS-PEOPLE:** a dwelling type on each household (apartment, mobile home, rowhouse, farmhouse, house) so the home picture follows it (stopgap SG-PLAY-home-dwelling-kind).

- **Owner question (built the simple version):** should a skip stop at the start of every work shift? M0-03 says a fixed commitment stops it, so it does now, and a skip is about one workday. I made shift ends carry on. If you'd rather skip past routine shifts too, say so and it becomes one switch.

- **OPUS-CORE:** a year takes about 3.3 hours now, so "skip until needed" can run for many minutes before a stop. Speed is first on your list; the bench needs nothing else from you for this.
- **OPUS-CORE (small):** when a skipping character answers its own choice, the bench resumes the core's own pick with `resumePlayerV1`. The saved act then reads `controlled:`, as if the player chose it. Could you add a resume kind such as `{ kind: "own-choice", pauseId }` that saves the act as the character's own decision? Until then the bench lists these answers separately under "Chosen by the character while you skipped".

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: `/play` builds the whole place two-level (OPUS-CORE). Measured in Napoleon ND (seed two-a): 264 full people, the town built in 60 s (population generation), and a played week took 1.3 s. In Vicksburg MI (seed two-b), a worker's first shift filled in 12 coworkers from the counts. Town size no longer needs shrinking in `/play`; the developer bench at `/` keeps its size field.
- Oct 12: merged main, `opus-core`, `opus-gov`, `opus-world` and `pool/P15-people-5` again. The golden path stays green (M0-01 to M0-06 pass), the bench tests pass, and in Funny River AK (seed art-e) 39 scenes drew 142 figures.
- Oct 12: Calendar and News tabs in `/play`. In Davenport ND (seed cal-a), the calendar shows the Nov 3 general election with 20 contests, family birthdays and the April 5, 2027 filing deadlines. News is empty in the first weeks, because nothing public has happened yet.
- Oct 12: the opening, first version. New life plays 8 shots: Oval Office, Senate floor, House floor, governor's office, state chamber, council or commission, home with family, home with you. Holders come from the offices records, including state and federal holders known only by their term identity. Everyone now dresses for the place (`placeWear`). In Knappa OR (seed open-a), every shot had its holders drawn.
- Oct 12: the game screen on the new core, `/play`. A new life starts as the resident nearest 18 in a random place, in the Kit 12/13 look: tabs, menu stack, player card with the clock, choices along the bottom, and the conversation lower third with the scales. Until needed runs in week legs so the clock visibly moves. Store-shot script added; 16 shots from Paris MS, Wayne WV, Thompsonville MI and Chickasaw Point SC. Next: the opening sequence (M6 order item 1), then the panel style pass.
- Oct 12: the whole world in the bench, and four new panels. Merged `opus-core`, `pool/P15-people-5`, `opus-gov` and `opus-world`; the bench town runs 15 modules. A 4,700-person town builds in 12 s, and a played week takes 6.8 s. The golden path stays green, and M0-01 to M0-05 pass on the full stack. New panels: Government (law here, who governs you, open contests, File, Request signatures), Conversation (OPUS-PEOPLE's `openConversation` and `say`, with the Lie button) and My life (`composeJournal`). Measured in Gunnison CO (seed gov-a): 7 laws in force, 31 seats held, 10 open contests; a council filing went to the municipal clerk, and 15 of 19 people asked signed. M0-05 now checks that the panel's running and missing rows match the installed modules.
- Oct 12: art in the bench. The scene picker (`src/bench/scene.ts`, rows in `src/bench/data/scene-places.json`) chooses the tagged backdrop from what the person is doing and draws the people there with the people engine on the staging spots. Measured: in Aiea HI (seed art-a) and Delaware City DE (seed art-b), 3 residents played a week each gave 78 scenes and 297 figures, every one real art. 5 children present had no adult art. Next: the art item's remaining places (capitols, campuses) as GOV's screens arrive, then screens for each golden-path step.
- Oct 12: bench item done. M0-01 to M0-05 registered in `docs/roadmap/features.json` as commands; pass flags left for the CTO. They pass under the runner in Kenova WV, Rockleigh NJ, Larrabee IA, Rachel NV and Cruz Bay USVI, about 64 s together. `opus-core` merged in; everything still green. Two stand-ins registered: SG-PLAY-bench-town-size and SG-PLAY-skip-own-choice-attribution. Next: art in the bench screens.
- Oct 12: **#3994 is green on `opus-play`.** The 25 new places have staging spots, and the anchors test passes all 538 checks over 163 places, including one existing newsroom seat that was failing. The spots live in `art/backdrops/staging.json` on this branch (commit "Art: staging spots for the 25 new places"); merge #3994 with this branch, or cherry-pick that commit onto it. Notes from the picture reading: the three "house-" pictures (Gulf Coast, New England, Northwest) are interiors, not exteriors; the convention-floor picture has the stage too far away for a speaker spot.

- Oct 12, morning: `opus-play` made from pool/M0-bench + main + P15 people + P10 drives + P13-5 director; draft PR #4002. The bench rebuild had dropped the people and drives files and rows, and those are restored. The bench now builds the full stack: a town builds in 60 s with 40,135 people and 7 modules. Switching residents works (the one you leave finishes their day on their own choices), and the character answers its own choices while you skip. The golden path is green and the 8 bench tests pass. Next: M0-01 to M0-05 as golden-path commands, then staging spots for the 25 new places (#3994).
