---
id: words-needs-words-60
title: "Needs from other sessions listed in words.md (line 60): 30 lines"
area: words
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/words.md "Needs from other sessions" (line 60)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- **OPUS-WORLD or OPUS-PEOPLE (a 17-year-old left alone):** in Richland, Georgia (`scene-year.ts --seed w15-h`, place 1365016), the mother Crystal Schroeder (`person_3a757177f2398cbe`) and the brother Jose moved away on November 7, 2026 (`person.moved-away:person_3a757177f2398cbe:2026-11-07`) and left Alexander, 17, al
- **OPUS-PEOPLE (no divorce yet):** the owner's family-scene example "a divorce" needs a producer: the situation library's `separated` cause is `awaitingProducer`. When the people engines end a marriage from the two people's records, the family scene at home reads it like a lost job (Oct 15).
- **OPUS-CORE (a played year stops on a finance contract):** a two-level bench world in Wakonda, South Dakota (`scene-year.ts --seed w15-c`, place 4668100) throws "Outside obligation refers to missing, inactive or unmatched recipient terms." (`src/core2/finance-cash.ts:1697`, from `runFinanceDay`) partway through its y
- **OPUS-CORE (a small place has no 17-year-old, again):** `buildPopulation` throws "No household of Utica, Montana holds a resident aged 17." (`scene-year.ts --seed w15-s`) (Oct 15).
- **OPUS-CORE (a played year stops on public pay):** a two-level bench world for `scripts/dialogue-batch/scene-year.ts --seed scenes-c` throws "Public pay does not match its actual owned work obligation." (`src/core2/public-work-pay.ts:177`, from the work module's payroll day) partway through its year (Oct 14).
- **OPUS-CORE (the address isn't a news story):** with the press module installed, the news module leaves stories to the press (`src/core2/modules/news.ts:434`), and the press never files the President's address. So `opening-story.test.ts` "is a public record the news carries" fails on `main` and on #4287. Either the p
- **OPUS-CORE (a played year stops on an obligation):** a two-level bench world in Waterford, California (the first place drawn for `dialogue:coverage --seed batch-10-r2`) throws "Only a current standing obligation can end." partway through its year. The batch drew another place; the world itself still can't finish its
- **OPUS-GOV (a local law with no title):** in Westerly, Rhode Island (seed `batch-10-r2`), bill 2027-3 passed with no title and no provisions on record. The words can't name a law with no title, so the batch leaves it out (Oct 14).
- **OPUS-PLAY (the State of the Union's picture):** the opening's President stage shows the White House exterior even for the State of the Union, which is given in the House chamber (`src/bench/data/opening-pictures.json`, `stages.president`). Opening on the House floor for that kind of address would match what the Spe
- **OPUS-CORE (a played year stops on a job end):** `src/core2/job-lifecycle.ts:91` throws "A job ends before its day's work, from calendar work." in Northchase, North Carolina (`drawPlace("batch-9:3", "dialogue-report")`, two-level bench world, 365 days from 2026-10-12). The grading batch now skips such a place and dr
- **OPUS-CORE (a small place has no 17-year-old):** `buildPopulation` throws "No household of Buffalo Prairie, Illinois holds a resident aged 17." (`src/core2/population.ts:737`, seed `123cb4d0296d73370ea181c4c24eb009e728208158c2aeac077ac71a014b19a2`, place key 1709499). The played world never opens there, so the golde
- **OPUS-PEOPLE (one import for all five banks):** `MINED_WORDS` in `scripts/english-corpus/index.ts` holds every bank in the shape the director reads (conversation, journal, filing visit, scene, bring-it-up, and the speech adapter). The items below say what each one needs.
- **OPUS-PEOPLE (closes `SG-P15-conversation-banks`):** read the director's conversation words from `data/english/parts/conversation.json` through `conversationDataFromBank` in `scripts/english-corpus/conversation-bank.ts` (move it under `src/director/` as you like). Three engine changes make it whole:
  1. An answer choice has several wordings: render each choice from all its variants (the grounded renderer's stable pick) instead of one fixed text. Until then the adapter picks one wording per choice by a stable key.
  2. Slots: the bank writes `{my_employer}`; the director's renderer reads `{{my-employer}}`. The adapter converts them.
  3. Skip a part the owner's grades hold back (`heldByGrades(part.key)`), as `composeFromBank` already does.
  4. Subjects the bank words that the director doesn't have yet: a greeting and its answer (`greet`: "Hi there.", "Good morning." / "Pretty good."), answers about family (`family`: "He's doing well.", "Thanks for asking."; asking after family isn't attested yet), school for a young person (`school`: "Where did you go t
- **OPUS-PEOPLE (journal rows for the new moments):** the journal bank now words moments the director has no row for yet. Each part's `uses[].journal` names the row: `day:` (an ordinary day; weather lines need `weather-rain`, `weather-snow`, `weather-hot` or `weather-cold`), `event:law` (a law passing or taking effect)
- **OPUS-PEOPLE (closes `SG-P15-journal-banks`):** pass `journalDataFromBank()` from `scripts/english-corpus/journal-bank.ts` as the journal's data. No engine change is needed; the relation words, count words and look-back stay the director's own data.
- **OPUS-PEOPLE (scenes and bring-it-up, `SG-P15-scene-banks`, `SG-P15-bring-it-up-banks`):** pass `sceneWordsFromBank()` to `composeScene` and `bringDataFromBank()` to `bringItUp` (both in `scripts/english-corpus/scene-bank.ts`); no engine change. Until the setting lines are mined, a scene could show its setting's rec
- **OPUS-GOV (speeches):** `giveSpeech` can compose a speech with the English engine's `composeAddress` from `data/english/parts/address.json`: each part's `uses` names the register (house-floor, senate-floor, state-floor, hearing, public-comment, chair, campaign, victory, concession) and the move. Sentences that open
- **OPUS-PEOPLE (news and TV, M2-09 and M6 news screens):** call `composeNewsStory(packet, kind)` from `scripts/english-corpus/newscast-bank.ts` (also `MINED_WORDS.news`) when a story is recorded, with `kind` one of `election`, `filing`, `vote-or-law`, `closing`, `opening`, `jobs-report`, `grant`, `hazard`, `death`. It
- **OPUS-PEOPLE (news, M2-09):** a story could carry a headline from `data/english/parts/headlines.json` and a lede from `news.json`; each part's `uses[].role` is the event kind it reports (`organization.closed`, `life.death`, ...). The engine shows news copy verbatim from a saved record, so compose the headline once w
- **OPUS-PEOPLE (conversations ask too much):** measured over 408 turns of mined conversations in Disputanta, Virginia; West Point, Utah; and Ursa, Illinois (`scripts/english-corpus/measure-conversations.ts`): turns run a median 4 words with 35% three words or fewer, close to real talk (5 words, 40%, `data/english/coun
- **OPUS-PEOPLE (fresh-eyes review, Oct 12, program logic):** a review of mined conversations in three drawn towns found these, all in the director rather than the words: (1) the player is offered "I'm at {my-employer}." right after saying it; (2) the player echoes the other's sighting ("I saw Trevor Chambers today." t
- **OPUS-PEOPLE (a repeated line):** in Dupont City (seed words-c9) Joshua says "I'm with McMillan's Kitchen." and two turns later raises "I work at McMillan's Kitchen." on his own: `otherRaises` doesn't see that his work was already said as a reply.
- **OPUS-PEOPLE or OPUS-PLAY (the opening speech, M6-01):** call `composeOpeningSpeech(packet, kind)` from `scripts/english-corpus/opening-speech-bank.ts` (also `MINED_WORDS.openingSpeech`) with `kind` from `openingSpeechKind(year)` (inaugural in a year after a presidential election, else State of the Union). It return
- **OPUS-PEOPLE (register card for the opening speech):** the cinematic opening (M-later, "the President's speech ... words come from the engine") needs a register card for a president's address (State of the Union, inaugural) in `src/presentation/speech-registers.ts`. Until then `scripts/english-corpus/address-bank.ts
- **OPUS-PLAY (choice names on the bench, closes part of `SG-PLAY-act-control-names`):** in `src/bench/server.ts`, serve `actions: { ...controls.actions, ...benchControlNames(controls.actions).actions }` from `scripts/english-corpus/choice-names-bank.ts` (also `MINED_WORDS.choiceNames`). For a button that names its tar
- **OPUS-PLAY (choice names, first note):** `data/english/parts/choice-names.json` names core actions by their action id (each part's `uses[].role`), and stance questions and answers. The bench can show these instead of the action ids.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
