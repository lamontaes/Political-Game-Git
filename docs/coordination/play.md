# OPUS-PLAY: What you play

Only OPUS-PLAY writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The bench, the game screens on the new core, the nightly integration build, store screenshots.
- **Branch:** opus-play (from pool/M0-bench).
- **Model:** Opus, medium: screens and integration on agreed designs.
- **Starts from:** The bench (#3940, branch pool/M0-bench), including the bench fixes that never started.

## Tonight's build (Oct 12)

Branch `opus-play` (draft PR #4002). Open a Codespace, run `npm run bench` and open port 3000.

**What you can do tonight**

- Generate a town anywhere in the 56 places from a seed. Town size starts at 2,000 people so days move fast. A full-size town works, but each day takes about 13 seconds until the core's speed work lands.
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
- [ ] **Store page screenshots.** Real gameplay screenshots for the Steam page by Friday, with capsule art from the art pipeline.
  - Verified by: Your sign-off.
  - Needs: CTO (art)
- [ ] **The opening.** Your opening sequence, from the place's officials and family, with engine words.
  - Verified by: M6-01.
  - Needs: GOV, PEOPLE

## Needs from other sessions

- **OPUS-GOV:** after merging `opus-core`, `src/core2/modules/offices.ts` lines 417, 432 and 586 fail typecheck. A table row now casts to `TermRow` only through `unknown` (`as unknown as TermRow`). The bench runs fine, but the repo typecheck is red there.
- **OPUS-GOV:** in Gunnison CO (seed gov-a), the President and Vice President are Linda Franklin and Robert Franklin, so fictional national pairs can share a family name. A U.S. Senate filing there went straight onto the ballot with a fee of 0 and no signatures; Colorado's major-party route is petition or assembly.
- **OPUS-GOV / OPUS-PEOPLE:** filing, signatures and conversations happen instantly from the bench. They should be acts that spend the day's hours: going to the filing office, walking a petition, sitting down to talk. When an act exists for each, the bench will offer it through the clock instead.
- **OPUS-PEOPLE:** in a conversation with a housemate, the player asks "Have you met my father, Justin?" about family in the same town. Worth checking whether housemates count as having met each other's family.

- **CTO (art queue):** people art for children and teenagers. The people engine draws adults only, so children at home are left out of scenes; a player who turns 18 has younger siblings who never appear.
- **OPUS-PEOPLE:** looks aren't shared within a family. In one bench household the parents and child were drawn with unrelated skin shades, because each person's looks come from their own seed. Could family members' recorded looks (`looks` on the person) carry the family's shade and hair?
- **OPUS-WORLD or OPUS-PEOPLE:** a dwelling type on each household (apartment, mobile home, rowhouse, farmhouse, house) so the home picture follows it (stopgap SG-PLAY-home-dwelling-kind).

- **Owner question (built the simple version):** should a skip stop at the start of every work shift? M0-03 says a fixed commitment stops it, so it does now, and a skip is about one workday. I made shift ends carry on. If you'd rather skip past routine shifts too, say so and it becomes one switch.

- **OPUS-CORE:** a year takes about 3.3 hours now, so "skip until needed" can run for many minutes before a stop. Speed is first on your list; the bench needs nothing else from you for this.
- **OPUS-CORE (small):** when a skipping character answers its own choice, the bench resumes the core's own pick with `resumePlayerV1`. The saved act then reads `controlled:`, as if the player chose it. Could you add a resume kind such as `{ kind: "own-choice", pauseId }` that saves the act as the character's own decision? Until then the bench lists these answers separately under "Chosen by the character while you skipped".

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: the whole world in the bench, and four new panels. Merged `opus-core`, `pool/P15-people-5`, `opus-gov` and `opus-world`; the bench town runs 15 modules. A 4,700-person town builds in 12 s, and a played week takes 6.8 s. The golden path stays green, and M0-01 to M0-05 pass on the full stack. New panels: Government (law here, who governs you, open contests, File, Request signatures), Conversation (OPUS-PEOPLE's `openConversation` and `say`, with the Lie button) and My life (`composeJournal`). Measured in Gunnison CO (seed gov-a): 7 laws in force, 31 seats held, 10 open contests; a council filing went to the municipal clerk, and 15 of 19 people asked signed. M0-05 now checks that the panel's running and missing rows match the installed modules.
- Oct 12: art in the bench. The scene picker (`src/bench/scene.ts`, rows in `src/bench/data/scene-places.json`) chooses the tagged backdrop from what the person is doing and draws the people there with the people engine on the staging spots. Measured: in Aiea HI (seed art-a) and Delaware City DE (seed art-b), 3 residents played a week each gave 78 scenes and 297 figures, every one real art. 5 children present had no adult art. Next: the art item's remaining places (capitols, campuses) as GOV's screens arrive, then screens for each golden-path step.
- Oct 12: bench item done. M0-01 to M0-05 registered in `docs/roadmap/features.json` as commands; pass flags left for the CTO. They pass under the runner in Kenova WV, Rockleigh NJ, Larrabee IA, Rachel NV and Cruz Bay USVI, about 64 s together. `opus-core` merged in; everything still green. Two stand-ins registered: SG-PLAY-bench-town-size and SG-PLAY-skip-own-choice-attribution. Next: art in the bench screens.
- Oct 12: **#3994 is green on `opus-play`.** The 25 new places have staging spots, and the anchors test passes all 538 checks over 163 places, including one existing newsroom seat that was failing. The spots live in `art/backdrops/staging.json` on this branch (commit "Art: staging spots for the 25 new places"); merge #3994 with this branch, or cherry-pick that commit onto it. Notes from the picture reading: the three "house-" pictures (Gulf Coast, New England, Northwest) are interiors, not exteriors; the convention-floor picture has the stage too far away for a speaker spot.

- Oct 12, morning: `opus-play` made from pool/M0-bench + main + P15 people + P10 drives + P13-5 director; draft PR #4002. The bench rebuild had dropped the people and drives files and rows, and those are restored. The bench now builds the full stack: a town builds in 60 s with 40,135 people and 7 modules. Switching residents works (the one you leave finishes their day on their own choices), and the character answers its own choices while you skip. The golden path is green and the 8 bench tests pass. Next: M0-01 to M0-05 as golden-path commands, then staging spots for the 25 new places (#3994).
