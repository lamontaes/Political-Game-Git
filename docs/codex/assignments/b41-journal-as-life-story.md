# The live Journal as your life story, written as you go (bank id b41, phase P3 (G56/G131), unlocks a Journal worth opening at every age and office, and the chapters b19 reads back at death)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are thirty-one, a month into your council seat in a town the game drew for you. You open the Journal. It does not list dates. The title is "My life", and it reads like something you wrote: "I grew up in Hazard. My mother, Ana, worked nights at the hospital, and my brother, Luis, and I learned to make dinner." Chapters follow the real turns of your life, with a title each: school, the warehouse job, the move, the first race, the loss, the seat. The newest chapter is the one still open, and a sentence lands in it the week something happens: the meeting where you spoke, the neighbor who asked for your help, the vote. The first time a person appears they come with what they are to you ("my campaign manager, Dee Okafor"); after that, just the first name. A switch lets you browse by year instead; it is the same story, cut differently. Dated detail stays one tap away under Record. Nothing is written for a feeling that no record backs, and when a chapter has nothing in it yet, it is not shown.

## Owner decisions it rests on

- Register, "Journal voice (September 22 and 24)": "The main chronicle is titled "My life" and written in first person ("I"). It is selective: first job, major work changes, public office and similar milestones, with routine dated detail kept under Record. Ordinary scene narration elsewhere remains second person ("you")."
- Register, same section: "statements about the character's inner life are grounded in recorded evidence; a feeling is never invented to make a sentence work."
- Register OCD-UI-009: "The Journal's default should be a narrative chronicle of meaningful periods and milestones, not a literal action-by-action list. The owner wants both meaningful life-phase chapters and annual chronology, with a view switch and date/year filtering over the same underlying history."
- Same entry: "One year may intersect multiple chapters and a chapter may span several years; no duplicate or contradictory life records."
- Owner words (Opus Oct 1-3, item 33): "They can see their story as it's written." and, from the playtest, "it looks like everything happened in February".
- Register, death retrospective: "journal-like, the kind that makes you say 'I forgot that happened.'" (b19 reads these same chapters back; this doc builds them live.)
- Brief rulings: people named by relationship on first mention; Journal never a dated list. No separate owner quote exists for "chapters written as you go"; G131 in ROADMAP-GAPS.md is the source, so the behavior is stated, not quoted.
- Fixed rules: zero dice; nothing blank or placeholder; one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- Two Journals exist on main. The Journal surface (`src/player/PlayerGame.tsx:4157`) mounts `src/player/World39Journal.tsx` with `shell.preferences.journalView`/`journalYear` (`presentation/shell-navigation.ts:147 JournalView = "chapters" | "years"`, defaults :239). A second, older one is `function JournalView` at `PlayerGame.tsx:5033` (toggle at :5007-5017, "Open the journal — everything that has happened"), which prints `projectLifeRecord` (`presentation/life-record.ts:77`) as headed lists plus a People list.
- `presentation/world39-journal.ts:74 projectWorld39Journal` builds entries from canonical history; `:470 groupWorld39Chapters` groups by year from the birth date; `:515 inOwnVoice` only swaps "Name's" to "Your" (second person, not first). `journal-first-person.ts:114 journalInFirstPerson` and `:173 journalChronicleInFirstPerson` swap pronouns on existing sentences.
- `presentation/journal-views.ts:186 chronicleLines` (month leads, paragraph break after `CHRONICLE_PARAGRAPH_SENTENCES = 4` at :128) and `:247 projectJournalView`. The comment at :41 marks the retrospective voice "PENDING RESEARCH, question `journal-chronicle-voice`"; the owner has since ruled first person.
- `presentation/journal-significance.ts:4 consequentialSocialEventIds`, `:19 isRoutineSocialOccasion` (what is routine). `presentation/life-so-far-english.ts:25 projectLifeSoFarEnglish` (introduction composer, used only by `player/WorldOrientationPanel.tsx` and its test). `simulation/narrative-threads.ts:203 narrativeThreads`.
- People and relation: `simulation/life-queries.ts:686 kinshipRelationshipsAt`; `presentation/life-story.ts:168 presentPeopleSentence` (appositive "Phoebe Akhtar, your classmate" form for scenes, second person). `composeGroundedLine` at `presentation/english-composition.ts:215`.
- Not on main: grep finds no `composeChapters`, `journal-chapter-title`, `officesHeldOverLife` or `projectLookBack` anywhere in `src` (they exist only as plans in b19). There is no live first-person chapter composer, no open/closed chapter record, and no first-mention rule outside b19's plan.
- Random place helper: `tests/support/random-place.ts:16 drawRandomPlace` (exists).

## Build steps (one PR each, in this order)

1. **One chapter composer, read from history.** `src/presentation/journal-chapters.ts` `composeChapters(world, personId, through)`: boundaries come from recorded turns (school stage, job, move, office, loss, partner, child), found from `projectWorld39Journal` entries, never stored; titles through `composeGroundedLine` with a `journal-chapter-title` bank; the last chapter is open when `through` is today. This is the same function b19 step 1 names: build it here if b19 has not landed, and if b19 landed first, only extend it. `Replaces:` the year-only grouping in `groupWorld39Chapters` as the default chapter source. Must not: a second composer.
2. **First person, relation on first mention.** One naming function over `kinshipRelationshipsAt` plus recorded roles (manager, coach, classmate, campaign staff) from records: first appearance "my mother, Ana", later "Ana". Reuse the introduction wording from `life-so-far-english.ts` and the appositive handling in `presentPeopleSentence`; do not fork either. Sentences are composed in first person, not pronoun-swapped. `Replaces:` `inOwnVoice` and `journal-first-person.ts` (delete what is unused; grep first). Must not: invent a relation no record holds; say a person's name alone when a relation is recorded.
3. **Written as you go.** Each new chapter-worthy record (by `journal-significance`, extended so routine days stay out) adds its sentence the next time the Journal opens; nothing is written to a separate store, so a saved game and a replayed one print the same page. Routine dated detail goes under Record. Inner-life sentences only where a trait, memory or recorded choice backs them (cite the record id in the test fixture). `Replaces:` `chronicleLines` month leads and `CHRONICLE_PARAGRAPH_SENTENCES`, and the `journal-chronicle-voice` PENDING note at `journal-views.ts:41`.
4. **One Journal screen.** `World39Journal.tsx` shows chapters (default) or years over the same entries, with the saved view and year filter unchanged. Delete the older `function JournalView` at `PlayerGame.tsx:5033` and its toggle; the nav Journal entry is the only door. Dated records open from a chapter line under Record. Existing kit classes only, no new palette.
5. **Wired to records.** Each line carries the ids of the records it came from; tapping a person, office, law or race opens that record page. A line whose record is missing is dropped, never printed blank.
6. **Hand-off to b19.** `projectLookBack` takes `composeChapters(world, personId, deathDate)` as its chapters; nothing at death is composed twice. Add the test that both read the same function.

## Must NOT build

A second journal, a biography or summary stored in the save; authored chapter text, titles or milestone lists; a fixed number of chapters or sentences; a dated list as the default; feelings with no recorded evidence; a legacy score; the death look-back page and remembered-lines ranking (b19); childhood moments themselves (b21 and the childhood record); the scene prose in play (Session 4); player-written notes (a later owner call, not authorized here).

## Research tables

Repo data first: all content is read from records (`world.history`, `kinshipRelationships`, the career, school and office tables). Voice follows the register entries quoted above. No number is needed; chapter boundaries come from recorded turns, not thresholds. If a PR wants a cut-off for "routine", it reuses `journal-significance` and does not add a value. Nothing to search; nothing invented.

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`; play from childhood through a job, a move and a first race. The Journal is titled "My life", reads in first person, has a distinct title per chapter, the newest chapter open, and no line begins with a date. The mother first appears as "my mother, <Name>", then by first name. A new event this week shows in the open chapter on the next open. Switching to years shows the same sentences re-cut.
- Same flow in a random territory place and D.C.: same code path, different people and offices.
- Tests: `journal-chapters.test.ts` (boundaries from a seeded life; open chapter; no empty chapter), `journal-first-mention.test.ts` (relation once, then name; no invented relation), `journal-live-update.test.ts` (an event after opening appears; reload prints identical text), `World39Journal.test.tsx` (view switch), a banned-words test (no "estimated", no statute cites, no dev words), and a grep test that `inOwnVoice`, the month-lead code and the old `JournalView` function are gone.

## Proof to post

PR comment per step: random place and seed, the printed Journal page, the record ids behind each sentence, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) whether the default view is chapters or years for a player under eighteen; (2) how long a chapter may run before it is split when nothing turns. Switches kept: default view = the existing `journalView` preference default (`shell-navigation.ts:239`, stays "chapters"); chapter split = one constant `CHAPTER_MAX_YEARS_WITHOUT_TURN` in `journal-chapters.ts`, estimated at a long stretch and marked "ESTIMATED FROM AVERAGE: life stages in the education and career tables". If b19 has not landed, build step 1 here and b19 reuses it; if Session 4 has not landed, compose through `composeGroundedLine` directly and stub the scene links.
