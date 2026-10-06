# B19 Death look-back: your life read back in your voice, then the record

Bank id b19 (spec file `b19-death-look-back.md`) · Phase "Two tracks to President / dynasty" · Unlocks the continuation step: the dead stay dead, you carry on as someone else in the same world.
Code checked at origin/main ec9a9601a.

## What the player experiences

When your character dies or is retired, the screen does not jump to "who do you continue as". It opens your journal one last time and reads your life back in your own voice: "I was born in Hazard in 1988. My mother, Ana, worked nights at the hospital." Chapters follow the real turns (school, first job, the move, the first race, the loss, the council seat) and surface things you forgot: the speech people still quote, the friend who turned on you, the ordinance about the bridge. People are named by what they were to you the first time they appear. Then you turn the page to the plain record: offices held with years, races won and lost, laws you passed in everyday words, your family, how and when you died, and who still carries your cause. Only then come the choices: continue as someone, read the full history, or keep watching.

## Owner decisions it rests on

- "Death look-back: story first (journal voice), then the record." Story first, record second, in that order on screen.
- Register Sept 28: "A death retrospective like Crusader Kings III or BitLife: journal-like, the kind that makes you say 'I forgot that happened.'" D-2 approved: favors, promises, the Journal and the death screen.
- Journal is a story: first-person chapters, never a dated list; name people by relationship on first mention. Plain American English, no citations, no numbers dumped on the player; years only.
- Register: the dead stay dead; continuation picks an existing living person in the same World (successor logic is not touched here).
- Zero dice. Nothing blank (a missing section is omitted, never an empty heading). One rule for all places. One writer per record kind. Delete what you replace.

## Existing code to extend (verified)

- `src/player/LifeContinuationPanel.tsx:18` (heading :95-101, successor choices, "View this life's record"); mounted `src/player/PlayerGame.tsx:2747`, `onViewRecord` at :2767.
- `src/presentation/people-continuation.ts:77 LifeContinuationView`, `:97 projectLifeContinuation`; `src/simulation/people-continuation.ts:172 lifeEnd`, `:273 successorCandidates`, `:132 controlledLineage`. `src/simulation/crisis/death-causes.ts:128 deathSentence`; `src/simulation/vitality.ts:68 recordPersonDeath`.
- Journal today: `src/presentation/journal-views.ts:41-42` (retrospective voice marked PENDING RESEARCH, question `journal-chronicle-voice`), `:128 CHRONICLE_PARAGRAPH_SENTENCES = 4`, `:186 chronicleLines`, `:247 projectJournalView`; `world39-journal.ts:74 projectWorld39Journal`, `:515 inOwnVoice`; `journal-first-person.ts:114,173` (pronoun swap); `journal-significance.ts:4,19`.
- Loading-time journal: `src/presentation/life-so-far-english.ts:25 projectLifeSoFarEnglish` (Session 7 is building chapters here: reuse its composer and kin naming, do not fork). `life-record.ts:77 projectLifeRecord`; `simulation/narrative-threads.ts:203 narrativeThreads`; `speech-remembered-english.ts` (D-3).
- `presentation/english-composition.ts:215 composeGroundedLine`; `presentation/own-election.ts:101 ownElectionResultsDecided`; `simulation/crisis/offices.ts:132 publicOfficesHeldBy` (offices held NOW only); `simulation/types.ts:4695 legislativeEnactments`; `simulation/life-queries.ts:686 kinshipRelationshipsAt`; `simulation/office-transition.ts` (has oath and service readers, no ended-term writer found at the spec's cite: check before relying on it).
- Newer code covering part: none. No `journal-chapters.ts`, no `officesHeldOverLife`, no look-back in the panel yet.

## Build steps (each is one PR; this is queued brief Q3 part 5 and shares Q3 part 3)

1. **Chapters (Q3 part 3, only if not landed).** `src/presentation/journal-chapters.ts composeChapters(world, personId, through)`: boundaries from recorded turns (school stage, job, move, office, loss); first-mention kin naming from `kinshipRelationshipsAt`; titles through `composeGroundedLine` with a `journal-chapter-title` bank. Builds on Session 7's composer. Replaces the month leads and pronoun-swap voice (`journal-views.ts`, `journal-first-person.ts`: delete what is unused). Must NOT: a second chapter composer.
2. **Whole-career office reader.** `officesHeldOverLife(world, personId)` beside `publicOfficesHeldBy` in `crisis/offices.ts`, from the same tables plus ended-term records. One reader used by the look-back and the person page.
3. **The projection.** `projectLookBack(world, predecessorId)` in `presentation/people-continuation.ts`, added to `LifeContinuationView` as `lookBack: { chapters, remembered, record }`. `chapters`: first person through the death date, years only. `remembered`: rank the life's entries by an extended `journal-significance entrySignificance` (how many people the event reached, whether others still bring it up via `speech-remembered-english` or knowledge records, whether a thread closed on it), favoring entries far back; how many show comes from how many clear significance, never a fixed count. `record`: offices with years; races won and lost; laws the person sponsored or signed in world words; family (partner, children, grandchildren, living and dead); cause of death (`deathSentence`); the movement they led and its leader now (b20's successor record when present, else omitted).
4. **The screen.** `LifeContinuationPanel.tsx`: the look-back first as a readable journal page (chapters as headings, remembered lines set apart), then a "Turn the page" step to the record, then the existing choices unchanged. Retirement shows the same look-back with the "goes on living" wording from the existing heading. Existing kit classes (Sessions 2/3), no new palette.
5. **Close the voice question.** Delete the PENDING note at `journal-views.ts:41` once the chapter voice ships (owner ruled: first person journal voice).

## Must not build

A second journal, biography store or summary saved at death (read canonical history at render); authored eulogy banks or fixed highlight lists; a score, rating, "legacy points" or victory tally; a fixed number of chapters or remembered moments; anything the dead person did not experience or know; changes to successor selection or estate logic (b20); numbers dumped on screen; a look-back for places only (every place reads the same path).

## Research tables

None needed: all content is read from records. Voice follows the filed owner rulings (`docs/research/requests/continuing-after-death-when-to-tell.json`: successor is an existing person who inherits nothing by default; write relationships naturally and invent nothing). No web search run.

## Done when

New game in a random place; skip or observe a life to death at any age with at least one job, one move and one race. The death screen shows first-person chapters with distinct titles; first mention of the mother reads "my mother, <Name>", later just the first name; at least one remembered line from more than 10 in-game years earlier; then the record page with offices and years, races, laws in plain words, family, cause of death; then the choices. Same for retirement. Tests: `src/presentation/people-continuation.lookback.test.ts` (a seeded life with one office and one enacted law shows both; no office means no office section; nothing past the death date); `journal-chapters.test.ts`; `LifeContinuationPanel` render test (look-back precedes choices); banned-words test over the composed look-back (no "estimated", statute cites, dev words).

## Proof to post

Under `docs/codex/evidence/b19-death-look-back/`: screenshots of the look-back page, the record page and the retirement case, the seed that replays them, and a printed list of which records each remembered line came from.

## Standing rules

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."

Open owner questions named in this doc: should the look-back also open on a simple save stop? Open item with its switch:

- A setting `lookBackAnytime` (default off = death and retirement only). When on, the Journal shows a "read my life so far" button calling the same `projectLookBack` with `through = today`. Build the projection date-generic now; the button is the only thing behind the answer.
- If Q3 part 3 chapters or Session 7's composer have not landed: build steps 2 and 3's `record` section and `remembered` now, with `chapters` a stubbed call to `composeChapters` returning the existing `projectLifeRecord` chapters until the composer replaces it.
- If b20's successor record is absent: the movement line is omitted, not blank.

## Standing rule (owner, Oct 5)

"NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building."
