# Death look-back: the story first, then the record (bank id b19, phase Two tracks to President / dynasty)

## What the player experiences

When your character dies (or you retire them from play), the screen does not jump straight to "who do you continue as". It opens your journal one last time and reads your life back to you in your own voice: "I was born in Hazard in 1988. My mother, Ana, worked nights at the hospital." The chapters follow the real turns of the life (school, the first job, the move, the first race, the loss, the council seat), and they surface the small things you had forgotten: the speech people still quoted, the friend who turned on you, the ordinance about the bridge. People are named by what they were to you the first time they appear. Then you turn the page to the plain record: offices held with years, races won and lost, laws you passed written in everyday words, your family, how and when you died, and who is still carrying your cause. Only after that do you see the choices to continue as someone, read the full history, or keep watching.

## Owner decisions this rests on

- "Death look-back: story first (journal voice), then the record."
- Register, Sept 28 list: "A death retrospective like Crusader Kings III or BitLife: journal-like, the kind that makes you say 'I forgot that happened.'"
- D-2 approved: "Favors, promises, the Journal and the death screen."
- Journal is a story: first-person chapters, never a dated list; name people by relationship on first mention.
- Register, death and earlier saves: the dead stay dead; continuation picks an existing living person in the same World.
- Plain American English, no citations, no numbers dumped on the player.

## Existing code it must use

- `src/player/LifeContinuationPanel.tsx:18` — the panel shown when a played life ends; heading :92-101, successor choices :104-148, "View this life's record" :162-166.
- `src/player/PlayerGame.tsx:2747` — mounts the panel; :2767 `onViewRecord` opens the person page.
- `src/presentation/people-continuation.ts:77` `LifeContinuationView` and `:97 projectLifeContinuation` — pure view of the ended life; heading from `deathSentence`.
- `src/simulation/people-continuation.ts:172 lifeEnd` (death or retirement), `:273 successorCandidates`, `:132 controlledLineage`.
- `src/simulation/crisis/death-causes.ts:128 deathSentence`; `src/simulation/vitality.ts:68 recordPersonDeath` (writes `history.personDeaths`).
- `src/presentation/journal-views.ts:40` (the retrospective voice is marked pending, question `journal-chronicle-voice`), `:128 CHRONICLE_PARAGRAPH_SENTENCES`, `:186 chronicleLines`, `:247 projectJournalView`.
- `src/presentation/world39-journal.ts:74 projectWorld39Journal` (dated biography entries), `:515 inOwnVoice`; `src/presentation/journal-first-person.ts:114/:173` (pronoun swap); `src/presentation/journal-significance.ts:4/:19` (routine social occasions filtered).
- `src/presentation/life-record.ts:77 projectLifeRecord` (chapters by age from canonical history); `src/simulation/narrative-threads.ts:203 narrativeThreads`.
- `src/presentation/speech-remembered-english.ts` (D-3: people quoting your speech from what they actually heard).
- `src/presentation/english-composition.ts` `composeGroundedLine` (the English engine; chapter titles and connective lines go through it).
- `src/presentation/own-election.ts:101 ownElectionResultsDecided` (your races, from recorded results).
- `src/simulation/crisis/offices.ts:132 publicOfficesHeldBy` (offices held NOW only; no whole-career reader exists).
- `history.legislativeEnactments` (`src/simulation/types.ts:4695`); `src/simulation/life-queries.ts:686 kinshipRelationshipsAt`.

## What to change

This spec IS queued brief Q3 part 5 ("My life" at death) and depends on Q3 part 3 (journal chapters). Build them as one track; do not write a second chapter composer.

1. **Chapters (Q3 part 3, if not already landed).** New `src/presentation/journal-chapters.ts composeChapters(world, personId, through)`: chapter boundaries from recorded turns (school stage, job, move, office, loss), first-mention kin naming from `kinshipRelationshipsAt`, titles through `composeGroundedLine` with a `journal-chapter-title` bank. Replaces the month leads and pronoun-swap voice in `journal-views.ts`.
2. **The look-back projection.** New `projectLookBack(world, predecessorId)` in `src/presentation/people-continuation.ts`, added to `LifeContinuationView` as `lookBack: { chapters, remembered, record }`.
   - `chapters`: `composeChapters` through the death date, first person, no dates finer than the year.
   - `remembered`: the "I forgot that happened" lines. Rank the life's entries by `journal-significance` (extend it with `entrySignificance`: how many people the event reached, whether others still bring it up via `speech-remembered-english` / knowledge records, whether a thread from `narrativeThreads` closed on it), and favor entries far back in the life. How many show comes from how many entries clear significance, never a fixed count.
   - `record`: offices with years; races won and lost (`ownElectionResultsDecided`); laws enacted where the person sponsored or signed (`legislativeEnactments`), each in world words from the existing law title readers; family (partner, children, grandchildren living and dead); cause of death (`deathSentence`); the movement or cause they led and who leads it now (reads b20's successor record when present; absent → omitted, not blank).
3. **Whole-career office reader.** Add `officesHeldOverLife(world, personId)` beside `publicOfficesHeldBy` in `crisis/offices.ts`, built from the same tables plus ended-term records written by `office-transition.ts`. One reader; the look-back and the person page both use it.
4. **The screen.** `LifeContinuationPanel.tsx`: the look-back comes first as a readable journal page (chapters as headings, remembered lines set apart), then a "Turn the page" step to the record, then the existing choices block unchanged. Retirement shows the same look-back with "goes on living" wording from the existing heading. Uses Session 2/3's kit classes; no new palette.
5. **Voice question closed.** Remove the PENDING note at `journal-views.ts:40` once the chapter voice ships (owner ruled: journal voice, first person).

## Must NOT build

- A second journal, biography store or summary record saved at death: everything is read from canonical history at render.
- Authored eulogy or obituary text banks; fixed "highlight" lists; a score, rating, "legacy points" or victory tally.
- A fixed number of chapters or remembered moments.
- Anything shown that the dead person did not experience or know (no hidden NPC facts).
- Changes to successor selection or estate logic (that is `simulation/people-continuation.ts` and Q5 part 3 / b20).
- Numbers dumped on screen (vote counts, dollar amounts); years only.

## Done when (proof in a played game)

- New game in a random place (stableHash-chosen state and town), observer-run or skip a life to death at any age with at least one job, one move and one race. The death screen shows: first-person chapters with distinct titles; the first mention of the mother reads "my mother, <Name>", later just the first name; at least one remembered line from more than 10 in-game years earlier; then the record page with offices and years, races, any laws in plain words, family, cause of death; then the choices.
- Same for a retirement.
- Tests: `people-continuation.lookback.test.ts` (a seeded life with one office and one enacted law shows both in `record`; a life with no office shows no office section, not an empty one; nothing beyond the death date); `journal-chapters.test.ts` (Q3 part 3's); `LifeContinuationPanel` render test (look-back precedes choices); banned-words test over the composed look-back (no "estimated", statute cites, dev words).
- PR body: screenshots of both pages and the seed so it replays.

## Depends on

- Q3 part 3 (journal chapters) — same track; Session 7 is building the journal's first chapters during loading (`life-so-far-english.ts`), so reuse its composer and kin naming rather than forking it.
- Session 4: `composeGroundedLine` and the trait reader `speakerTraits` (voice in the player's personality).
- b20 for the movement-successor line (optional field until it lands).

## Open questions for the owner

- Should the look-back also open when you simply stop a save (not death or retirement)? (a) No, only death and retirement; (b) yes, as a "read my life so far" button in the Journal at any time.
