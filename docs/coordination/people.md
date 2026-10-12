# OPUS-PEOPLE: People and their stories

Only OPUS-PEOPLE writes this file. See "The team" in `AGENTS.md` and `docs/coordination/BOARD.md`.

- **Owns:** The people engines (kin, closeness, grief, memory, views, births and moves, drives) and the story director.
- **Branch:** its current pool/P15-people-5 branch.
- **Model:** Opus, high: modeling people is judgment work.
- **Starts from:** Its own people work (P15 parts 1–5, #3956, #3964), the story director (#3926–#3930, which joins this pillar), views (#3965) and births (#3960).

## What the owner can play now

- **Steps 1 and 2 in the core (not yet on screen).** A new life at 18 in any of the 56 places has parents and siblings who follow the kin rules, real schools from the place data, and a record behind every fact. Over 91 days that person meets new people on visits and on joining groups, each meeting a dated fact naming the place, and some of those ties grow closer. Both run as golden-path checks in a randomly drawn place. They reach the owner's screen once OPUS-PLAY's bench shows the life and the circle.

## Checklist

An order of work, not a ceiling: when it's done, keep going into this area's next roadmap items.

- [x] **A life at 18 and meeting people (steps 1 and 2).** Finish part 5; merge the encounters and closeness reasons (#3964) into its branch.
  - Done Oct 12: #3964, the story director (`pool/P13-5`) and main merged in. #3964 and this branch had each built part 5 from the same commit; this branch's version stays because saved traces, appraisal and the M0-07 test already use it. M0-06 and M0-07 are registered golden-path commands and pass in drawn places (Repton, Alabama; Martha Lake, Washington). The owner plays them once the bench shows them.
  - Verified by: M0-06 and M0-07 in the bench; you play steps 1 and 2.
  - Needs: PLAY (bench)
- [x] **People in the two-level world.** With CORE: filled-in people get kin and a past that match the records; memories keep what matters and summarize the rest.
  - Done Oct 12 on my side: a person filled in alone gets the same kin and past as in the full town (`src/core2/fill-in-people.test.ts`); each watched person forgets once a month, keeping the last season whole and the 24 strongest older moments, and folding the rest into monthly summaries without changing how much anyone matters to them (`src/director/director.test.ts`). CORE's counts layer calls these; its fill-in tests are the rest of the check.
  - Verified by: CORE's fill-in tests; a person's memory stays roughly the same size across a year.
  - Needs: CORE
- [x] **Words: the English engine on the new core (owner, Oct 12).** Bring the English engine (`src/presentation/english-*.ts` and the `*-english.ts` writers) onto the new core, so conversations, scene narration and the journal come from record data: every conversation choice names something real, the Lie button sits beside the replies, and the journal reads as a first-person story that never invents a feeling. No hand-written player text.
  - Verified by: M4-02 and M4-03 in a random place: the step 1 and 2 conversations and a year's journal trace every statement to a record; a batch of real engine output goes to the owner for grading, and his grades feed the engine.
  - Needs: PLAY (conversation box and journal screens), GOV (the clerk at filing)
  - Done Oct 12 (first version): the journal, conversations with the scales, scenes and the death look-back run on the new core through the English engine's grounded renderer, each tested in a generated place with every line tracing to records (`src/director/journal.ts`, `conversation.ts`, `scene.ts`). Still open, as registered stopgaps: wording composed from the mined speech corpus instead of the three hand-written template banks, and a 100-item batch for the owner to grade. Speeches and people bringing things up (M4-05) come with GOV's laws and campaigns.

- [x] **Political views.** Values and stances formed from each person's life, changing from causes, checked against the CES survey.
  - Verified by: M1-10: two random states' views against the answer keys; one big event shifts only the people it touched.
  - Done Oct 12 (first version): CES 2024 is reachable now (CC0, 56,384 respondents); its weighted spreads by state, age, education, faith, place type and county are derived into `src/core2/data/views/ces-2024-views.json` (the microdata stays out of the repo; `data/research/views/derive-ces-2024-views.py` rebuilds it). Each person's opening lean and engagement come from their state and age cell with a share their household holds in common; a recorded event with a topic moves the stances of only the people it reached, with its cause. Jena, Louisiana: town lean 0.31 against Louisiana's 0.30; Princeville, Illinois: −0.13 against −0.10. Still open (registered stopgap): education and faith on person records, the 14 values, and conversations and news moving views.

- [ ] **Births, then moves.** Births from couples' circumstances (ready for checking); then moves for jobs, family, rent and evictions.
  - Verified by: M1-09: births and moves inside the place's real rates over a year.
  - Needs: WORLD (jobs, housing for moves)
- [ ] **Who runs for office.** People decide to run, or not, from their drives, views and circumstances.
  - Verified by: M2-04: every candidate on the ballot filed through those choices, with recorded reasons.
  - Needs: GOV (filing)
- [ ] **Drives and moments.** Losses from the economy form drives; campaigns, votes and laws make moments; people bring them up.
  - Verified by: M1-11, M4-01 and M4-05.
  - Needs: WORLD (events), GOV

## Needs from other sessions

- **OPUS-PLAY:** the bench screens for step 1 (the 18-year-old's family, schools and the record behind each fact) and step 2 (the circle, each meeting and why a tie grew closer). The data is `pastFacts`, `knownIds` and each relationship's `latestChange` on `pool/P15-people-5`.
- **OPUS-CORE (two-level population):** filling someone in is ready on my side. Build a household's kin with `buildOpeningKin([thatHousehold], options)` and its members' past with `buildDeepPast(inputHoldingThem, { peerCohortSize })`; both give exactly what the full-town build gives (`src/core2/fill-in-people.test.ts`). The one thing I need from the counts: `peerCohortSize(circle, contextKey)`, the records' count of people in that school class or workplace. Relatives outside the household stay husks until met, and ties to classmates or coworkers appear as each is filled in.
- **CTO (zero-dice):** six list-picks were already on this branch before today and the allowlist only shrinks, so I can't record them myself: births' timing in `opening-kin.ts`, household ages in `opening-partnership.ts` (two lines), the school name pattern and the enrollment-weighted school in `deep-past.ts` (two lines). All but the school are GENERATION keyed by the household or person. The inventory says a school pick isn't generation, because the school follows from where the family lived; the core doesn't model where in the place a home is yet. Should I keep it as a registered stopgap until homes have locations, or do you want a different rule now?
- **CTO or FIXER (American English sweep):** `tests/american-english-sweep.test.ts` fails on this branch over real proper names in generated data: school names in `src/core2/data/opening-schools.json` (NCES, e.g. "Harbour", "Centre") and owner names in `src/core2/data/opening-public-owners-2017.json`. They must keep their real spelling. The fix is one row each in `AMERICAN_ENGLISH_EXEMPT` in `scripts/prose-eval/american-english-scope.ts` ("real names from federal school and ownership records"). That file is shared tooling, so I haven't touched it.
- **OPUS-PLAY:** a staged scene is `composeScene(core, director, personId, scheduleEntry)` from `src/director/scene.ts`: `narration` lines (second person, each with its records), `presentIds` for staging, the setting's kind and record for the art, and `talkToId` to open the conversation.
- **OPUS-PLAY:** the conversation box can drive `openConversation(core, playerId, otherId)` and `say(core, conversation, choiceKey)` from `src/director/conversation.ts`: `lines`, `choices` (each with the records behind it) and `lie` (the scales; null means dimmed). It records what was said as core events at the current date.
- **OPUS-PLAY:** the "My life" screen can read `composeJournal(core, director, playerId)` from `src/director/journal.ts`: chapters, each with a title and first-person lines, every line carrying the record ids behind it.
- **CTO:** the PR suite now runs four commands in about 288 s against its 300 s budget; M0-06 and M0-07 spend most of theirs loading data. If the budget becomes a problem, give the people checks the nightly run or a larger PR budget.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: political views on the new core (`src/core2/modules/views.ts`), checked against CES 2024 in two drawn towns (`src/core2/views.test.ts`). #3965's views code was never pushed, so this is built fresh and small. Next: births (#3960).
- Oct 12: scenes on the new core (`src/director/scene.ts`). When the director stages a moment, the scene is built from its blocks in second person: where you are from the setting's record, who the records put there, and what led here, then it opens a conversation with the person who starts it. In Wendell, North Carolina (seed scenes-a), January: "You're out in Wendell. Robert Wilkins is here. You and Robert have been seeing each other lately." then Robert asks "Are you still living in Wendell?" with five choices. Next: the death look-back and people bringing things up (M4-05), then views.
- Oct 12: conversations on the new core (`src/director/conversation.ts`). The other person opens by asking about something real ("Do you remember Jackson Center High School?", "Still at Chen's General Store?"); the player gets four to six choices, each answering that line and raising another real subject: their own work, the town, people both know ("Have you seen Shawn Patel?"), relatives the other hasn't met ("Have you met my sister, Ann?"). Replies come from the other person's records ("I'm at Craig Brothers Farm.", "I haven't seen Stacy Woodard lately."). The scales line exists only for a question about the player's own record that the listener doesn't already know; a lie is recorded with its exact claim and hearer, the director keeps it, and it ends the day the hearer learns the truth. Leaving is the screen's button. Next: scenes (M4-03), then speech-mined wording.
- Oct 12: the journal on the new core. `composeJournal` writes "My life" as first-person chapters through the English engine's grounded renderer: chapters turn at school, work, a child and moves; relatives are "my son", "my sister"; repeats fold ("I saw Judith Noble three times."); every line cites the records behind it, and the bank has no feeling words. In Semmes, Alabama (seed journal-b), a 53-year-old's journal opens with her three schools, then "My son was born.", then her start at the police department and someone she met. Templates are a registered stopgap until composed from mined speech. Next: conversations (M4-02).
- Oct 12: forgetting built. In a year of news every three days, a watched person's stored moments hold steady from July to January (a season plus 24), while without forgetting they keep growing; each pair's importance matches the keep-everything run exactly. Found and fixed a director bug on the way: an old tie that kept coming back counted its own earlier comebacks, so its importance grew without limit (3.8 × 10^34 in that year). Now a comeback renews the tie and counts the history once.
- Oct 12: fill-in ready for CORE. A household filled in alone gets the same kin, and its people the same past, as in the full-town build: 0 differences for 608 people across 60 households (seed fill-a), and a test now holds it. Classmates and coworkers are now grouped from each person's own key and the class's size in the records, not from who else was built. Memory measured over a year: per person, known facts (17), ties (8.4) and the director's moments (2.5 per watched person) stay flat, so nothing grows yet; forgetting is next so it stays that way once campaigns and drives add moments.
- Oct 12: merged #3964, `pool/P13-5` and main; typecheck clean; golden path green with M0-06 (Repton, Alabama, 103 s) and M0-07 (Martha Lake, Washington, 157 s) passing as goals. Next: people in the two-level world.
