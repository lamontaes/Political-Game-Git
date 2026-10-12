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
- [ ] **People in the two-level world.** (In progress: fill-in side done Oct 12; forgetting next.) With CORE: filled-in people get kin and a past that match the records; memories keep what matters and summarize the rest.
  - Verified by: CORE's fill-in tests; a person's memory stays roughly the same size across a year.
  - Needs: CORE
- [ ] **Words: the English engine on the new core (owner, Oct 12).** Bring the English engine (`src/presentation/english-*.ts` and the `*-english.ts` writers) onto the new core, so conversations, scene narration and the journal come from record data: every conversation choice names something real, the Lie button sits beside the replies, and the journal reads as a first-person story that never invents a feeling. No hand-written player text.
  - Verified by: M4-02 and M4-03 in a random place: the step 1 and 2 conversations and a year's journal trace every statement to a record; a batch of real engine output goes to the owner for grading, and his grades feed the engine.
  - Needs: PLAY (conversation box and journal screens), GOV (the clerk at filing)
- [ ] **Political views.** Values and stances formed from each person's life, changing from causes, checked against the CES survey.
  - Verified by: M1-10: two random states' views against the answer keys; one big event shifts only the people it touched.
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
- **CTO:** the PR suite now runs four commands in about 288 s against its 300 s budget; M0-06 and M0-07 spend most of theirs loading data. If the budget becomes a problem, give the people checks the nightly run or a larger PR budget.

## Log

Newest first: one line per event (what changed, the measured result, what's next).

- Oct 12: fill-in ready for CORE. A household filled in alone gets the same kin, and its people the same past, as in the full-town build: 0 differences for 608 people across 60 households (Rutherford-sized test town, seed fill-a), and a test now holds it. Classmates and coworkers are now grouped from each person's own key and the class's size in the records, not from who else was built. Memory measured over a year: per person, known facts (17), ties (8.4) and the director's moments (2.5 per watched person) stay flat, so nothing grows yet; forgetting is next so it stays that way once campaigns and drives add moments.
- Oct 12: merged #3964, `pool/P13-5` and main; typecheck clean; golden path green with M0-06 (Repton, Alabama, 103 s) and M0-07 (Martha Lake, Washington, 157 s) passing as goals. Next: people in the two-level world.
