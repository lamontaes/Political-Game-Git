# Story split, Nov 26, 2026: where every file of #10390 goes

Story PR #10390 (`story/first-evening`, head `e6169835`) changes 273 files since its merge base with main (`ea60e9eb`). This is the ledger for step 1 and step 2 of the split. It is read from git, file by file: the story branch's blob against the merge base and against `train/nov26-c` (the newest open train, PR #10682), and each file's own commits with the history-reader and merge commits taken out.

## What the files are

| Group | Files |
| --- | --- |
| Engine (`src/**` and `scripts/**` that are not tests) | 127 |
| Words and data (`data/english/**`, `src/director/data/**`, `docs/story/**`, `data/press/**`) | 93 |
| Tests (test files, browser checks, `tests/**`) | 31 |
| Other (skills, docs, pool, content data) | 22 |

## What happens to each


| Decision | Files | Meaning |
| --- | --- | --- |
| landed | 48 | `train/nov26-c` already holds the identical file, so it lands with #10682. Nothing to do. |
| drop | 22 | The story branch's copy of the history reader (#10634 to #10641, which reached main as #10668). Train's version covers it; the story branch has no commit of its own on the file. |
| port | 203 | Story's own change, not on train. It lands in the piece named in the last column, in the order below. |

The branch has 932 commits since the merge base (the PR page counts 890): 881 by sessions, 42 by the owner's account (mostly the history reader and main merges) and 9 by the Actions bot. The history files were told apart from Story's own by commit: a file whose only commits are history ones, with the train's reader present, is a drop.

## The pieces, in the order they land

Each piece is one pull request off `train/nov26-c` (then off main once #10682 lands). Engine pieces first, because the words half needs them. The words come after as data only, in batches by part, each with its scenes before and after at three drawn places and the sameness gate and pre-grade passing. Files are carried byte for byte from the story branch or merged with `git merge-file` against the merge base, never rewritten by hand, and no graded line is changed or deleted.

| Piece | Files to port |
| --- | --- |
| 1 outline planner, its banks and the sameness gate | 20 |
| 2 address and the talk after it | 45 |
| 3 person history and loading story | 26 |
| 4 journal | 9 |
| 5 news and reach scope | 15 |
| 6 talk engines (build on #10664) | 36 |
| 7 elements and the guards on them (data only) | 42 |
| 8 skills, pointers, docs | 10 |

Notes on the pieces:

- **1. The outline planner** (`src/english/outline-planner.ts`) is the engine every telling goes through, and it imports its ten banks (`outlines.json`, `parts/outline*.json`), so the banks travel with it as data nothing plays yet. It carries the sameness gate (`scripts/sameness/gate.ts`, `skeleton.ts`, `draw-count.ts`, which import the planner), the register's wiring for the new banks (`line-register.ts`, its baseline and `pulled.json`) and the loading-steps bank the register also reads. Nothing on train calls the planner, so no played line moves. Nothing in pieces 2 to 5 works without it. The first pass of this ledger had the gate as a piece of its own; it imports the planner, so they are one.
- **6. Talk engines** change `conversation.ts`, `scene-talk.ts` and `purpose-scene.ts`, which Talk engines is merging on the #10664 line. Those changes are built on that branch after a post on #10377 to Talk engines, and not before.
- Files that another session changed in the last two days (any branch not in this train) are marked in the table. They are listed and passed over until the owner of that work lands, except the talk files, which step 3 allows.

## Decision per file

Why is the last story-own commit's subject, trimmed. "history reader" means the file's only commits are the reader's. The "Recent" column is how many other open branches touched the file in the last two days.


### Engine

| File | St | Decision | Piece | Recent | Why |
| --- | --- | --- | --- | --- | --- |
| `scripts/sameness/draw-count.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: lines cite their elements; the draw count and drawn gate in the spec |
| `scripts/sameness/gate.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `scripts/sameness/inputs/campaign-speech-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the drawn address inputs so far (partial: recording continues) |
| `scripts/sameness/inputs/campaign-speech-six.jsonl` | A | port | 2 address and the talk after it |  | story: the mayor's address and the campaign speech route through the one outline planner |
| `scripts/sameness/inputs/inaugural-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the address gate over 60 drawn lives |
| `scripts/sameness/inputs/inaugural-six.jsonl` | A | port | 2 address and the talk after it |  | story: a bank per Story writer, and the sameness gate in the repo |
| `scripts/sameness/inputs/journal-chapter-open-drawn.jsonl` | A | port | 4 journal |  | story: the drawn chapter-opener inputs, 30 worlds |
| `scripts/sameness/inputs/journal-evening-drawn.jsonl` | A | port | 4 journal |  | story: the evening gate inputs over 60 drawn lives (journal 60, talk 44) |
| `scripts/sameness/inputs/journal-evening-six.jsonl` | A | port | 4 journal |  | story: a bank per Story writer, and the sameness gate in the repo |
| `scripts/sameness/inputs/loading-story-drawn.jsonl` | A | port | 3 person history and loading story |  | story: a kind may set its own specific floor; the loading story's is 30 |
| `scripts/sameness/inputs/news-address-headline-six.jsonl` | A | port | 5 news and reach scope |  | news: headline-kind gate inputs for the address and the vote story |
| `scripts/sameness/inputs/news-address-six.jsonl` | A | port | 5 news and reach scope |  | story: the outline's news stories could never print; and the news gate inputs |
| `scripts/sameness/inputs/news-roll-call-headline-six.jsonl` | A | port | 5 news and reach scope |  | news: headline-kind gate inputs for the address and the vote story |
| `scripts/sameness/inputs/news-roll-call-six.jsonl` | A | port | 5 news and reach scope |  | story: the outline's news stories could never print; and the news gate inputs |
| `scripts/sameness/inputs/state-of-the-state-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the drawn address inputs so far (partial: recording continues) |
| `scripts/sameness/inputs/state-of-the-state-six.jsonl` | A | port | 2 address and the talk after it |  | story: the State of the Union and the State of the State route through the one outline planner |
| `scripts/sameness/inputs/state-of-the-union-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the drawn address inputs so far (partial: recording continues) |
| `scripts/sameness/inputs/state-of-the-union-six.jsonl` | A | port | 2 address and the talk after it |  | story: the State of the Union and the State of the State route through the one outline planner |
| `scripts/sameness/inputs/talk-address-point-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the evening gate inputs over 60 drawn lives (journal 60, talk 44) |
| `scripts/sameness/inputs/talk-address-point-six.jsonl` | A | port | 2 address and the talk after it |  | story: the talk's gate input (five speakers, six packet worlds) |
| `scripts/sameness/inputs/town-address-drawn.jsonl` | A | port | 2 address and the talk after it |  | story: the drawn address inputs so far (partial: recording continues) |
| `scripts/sameness/inputs/town-address-six.jsonl` | A | port | 2 address and the talk after it |  | story: the mayor's address and the campaign speech route through the one outline planner |
| `scripts/sameness/news-inputs.ts` | A | port | 5 news and reach scope |  | story: the outline's news stories could never print; and the news gate inputs |
| `scripts/sameness/record-address-inputs.mts` | A | port | 2 address and the talk after it |  | story: the State of the Union and the State of the State route through the one outline planner |
| `scripts/sameness/record-evening-inputs.mts` | A | port | 2 address and the talk after it |  | story: the evening's journal and the address-point talk as exported tellings, and the recorder that draws thei |
| `scripts/sameness/record-journal-chapter-inputs.mts` | A | port | 4 journal |  | story: the chapter-opening sentence through the one outline planner |
| `scripts/sameness/record-loading-inputs.mts` | A | port | 3 person history and loading story |  | story: the loading story's telling input, and its gate recorder |
| `scripts/sameness/skeleton.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `scripts/story/coverage.ts` | M | port | 7 elements and the guards on them (data only) |  | story: the issues field, its guard against the bill catalog, and the coverage map (docs/story/coverage.md) by  |
| `scripts/words/first-evening-packet.ts` | A | port | 2 address and the talk after it |  | story: the theme said is the argued point's; the packet script |
| `scripts/words/opening-talk-trace.ts` | M | port | 2 address and the talk after it |  | story: the talk after the address through the planner; one arrival line |
| `src/bench/archive-words.ts` | M | port | 4 journal | 1 | story: the Journal's first evening and the address's news story through the planner |
| `src/bench/bill-stage.ts` | M | port | 5 news and reach scope | 1 | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/bench/calendar.ts` | M | landed | - | 1 | same as train |
| `src/bench/campaign.ts` | M | drop | - | 1 | the history reader |
| `src/bench/card.ts` | M | port | 3 person history and loading story | 1 | person history: sentences open on a stretch of life (in their teens, in their thirties) instead of a year or a |
| `src/bench/changes.ts` | M | drop | - |  | the history reader |
| `src/bench/data/controls.json` | M | port | 3 person history and loading story |  | story: the loading screen's progress messages, short and dry about what the game builds |
| `src/bench/dev-mode.ts` | M | drop | - | 1 | the history reader |
| `src/bench/dev-trace.ts` | M | landed | - | 1 | same as train |
| `src/bench/dev-views/address-parts.ts` | M | landed | - | 1 | same as train |
| `src/bench/dev-views/dev-closing.ts` | M | landed | - | 1 | same as train |
| `src/bench/dev-views/opening.ts` | M | landed | - | 2 | same as train |
| `src/bench/dev-why.ts` | M | landed | - | 1 | same as train |
| `src/bench/government-bodies.ts` | M | landed | - | 1 | same as train |
| `src/bench/handler.ts` | M | port | 3 person history and loading story | 1 | loading: dry progress lines from a loading-steps bank, said for the place being built |
| `src/bench/law-did.ts` | M | landed | - | 2 | same as train |
| `src/bench/loading.ts` | M | port | 3 person history and loading story |  | story: the loading card tells the player's life as a short wry story |
| `src/bench/m0-check.ts` | M | landed | - | 1 | same as train |
| `src/bench/nation-news.ts` | M | landed | - | 1 | same as train |
| `src/bench/opening.ts` | M | port | 2 address and the talk after it | 1 | story: the talk after the address through the planner; one arrival line |
| `src/bench/play.css` | M | port | 3 person history and loading story | 2 | story: the loading card tells the story only, whole, from the top |
| `src/bench/play.mjs` | M | port | 3 person history and loading story | 1 | story: the talk after the address through the planner; one arrival line |
| `src/bench/printed-words.ts` | M | port | 5 news and reach scope | 1 | story: the Journal's first evening and the address's news story through the planner |
| `src/bench/progress.ts` | M | landed | - | 1 | same as train |
| `src/bench/reached.ts` | M | drop | - |  | the history reader |
| `src/bench/results.ts` | M | landed | - |  | same as train |
| `src/bench/scene.ts` | M | landed | - | 1 | same as train |
| `src/bench/states.ts` | M | landed | - | 1 | same as train |
| `src/bench/ui/strips.mjs` | M | port | 3 person history and loading story | 1 | Card: a stretch of life is one telling, joining the records of its kinds |
| `src/bench/world.ts` | M | port | 3 person history and loading story | 2 | loading: dry progress lines from a loading-steps bank, said for the place being built |
| `src/core2/data/campaigns/recall-answers.json` | M | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/core2/data/history/reader.json` | A | drop | - |  | the history reader |
| `src/core2/data/life/remembered.json` | M | landed | - |  | same as train |
| `src/core2/electorate-century.ts` | M | drop | - | 2 | the history reader |
| `src/core2/household-cost.ts` | M | port | 5 news and reach scope | 1 | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/core2/law-reach/applied.ts` | M | port | 5 news and reach scope | 2 | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/core2/law-reach/scope.ts` | A | port | 5 news and reach scope |  | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/core2/modules/campaigns.ts` | M | port | 5 news and reach scope | 2 | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/core2/modules/corruption.ts` | M | port | 6 talk engines (build on #10664) | 2 | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/core2/modules/counted-moves.ts` | M | landed | - | 1 | same as train |
| `src/core2/modules/elections.ts` | M | drop | - | 2 | the history reader |
| `src/core2/modules/jobs.ts` | M | drop | - | 1 | the history reader |
| `src/core2/modules/justice.ts` | M | port | 5 news and reach scope | 2 | story: whom a bill reaches in the vote story (reaches-<group>, from the law-reach data's scope); reachScopeOf  |
| `src/core2/modules/laws.ts` | M | drop | - | 2 | the history reader |
| `src/core2/modules/legislature.ts` | M | drop | - | 2 | the history reader |
| `src/core2/modules/news.ts` | M | landed | - | 1 | same as train |
| `src/core2/modules/offices.ts` | M | drop | - | 2 | the history reader |
| `src/core2/modules/people.ts` | M | drop | - | 1 | the history reader |
| `src/core2/modules/record.ts` | M | landed | - | 1 | same as train |
| `src/core2/past-elections.ts` | M | landed | - | 1 | same as train |
| `src/core2/past-history.ts` | A | drop | - | 1 | the history reader |
| `src/core2/past-module.ts` | M | drop | - | 1 | the history reader |
| `src/core2/past-school.ts` | M | drop | - | 1 | the history reader |
| `src/core2/past.ts` | M | landed | - | 1 | same as train |
| `src/core2/person-life.ts` | M | drop | - | 1 | the history reader |
| `src/core2/pre-start.ts` | M | drop | - | 1 | the history reader |
| `src/core2/shared-history.ts` | M | drop | - | 1 | the history reader |
| `src/director/address-anchor.ts` | A | port | 2 address and the talk after it |  | story: an address tells its problem through one resident (the owner's P21; story-address-anchor-person): ancho |
| `src/director/address-kind.ts` | M | landed | - | 1 | same as train |
| `src/director/address-render.ts` | M | port | 2 address and the talk after it | 2 | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `src/director/address-story.ts` | M | port | 2 address and the talk after it | 1 | story: the inaugural's facts from their engines, a planner test, guards green |
| `src/director/address-telling.ts` | A | port | 2 address and the talk after it |  | story: the State of the Union and the State of the State route through the one outline planner |
| `src/director/arc-variant.ts` | M | landed | - | 2 | same as train |
| `src/director/bribe-facts.ts` | M | landed | - | 1 | same as train |
| `src/director/circumstance.ts` | M | landed | - | 1 | same as train |
| `src/director/conversation.ts` | M | port | 6 talk engines (build on #10664) | 2 | story: the pre-grade's fails that are words: one arrival, the paycheck line, the diary's side |
| `src/director/home-work-facts.ts` | M | landed | - |  | same as train |
| `src/director/journal-chapter-open.ts` | A | port | 4 journal |  | story: the chapter-opening sentence through the one outline planner |
| `src/director/journal-evening.ts` | A | port | 4 journal |  | story: the Journal's first evening and the address's news story through the planner |
| `src/director/journal-later.ts` | M | landed | - | 2 | same as train |
| `src/director/journal.ts` | M | port | 4 journal | 1 | story: the Journal's first evening and the address's news story through the planner |
| `src/director/ledger.ts` | M | drop | - | 2 | the history reader |
| `src/director/life-news.ts` | M | landed | - |  | same as train |
| `src/director/local-address.ts` | M | port | 2 address and the talk after it | 2 | story: the State of the Union and the State of the State route through the one outline planner |
| `src/director/local-speeches.ts` | M | port | 2 address and the talk after it | 2 | story: the mayor's address and the campaign speech route through the one outline planner |
| `src/director/opening-facts.ts` | M | port | 2 address and the talk after it | 1 | story: the inaugural says its stand again, and the pre-grade's early fails |
| `src/director/opening-story.ts` | M | port | 2 address and the talk after it | 2 | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `src/director/purpose-scene.ts` | M | port | 6 talk engines (build on #10664) | 1 | story: one {office} in every scene (the interview reads officeSaid, as the door knock does); the director's ne |
| `src/director/relation-facts.ts` | M | landed | - | 1 | same as train |
| `src/director/scene-talk.ts` | M | port | 6 talk engines (build on #10664) | 2 | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/scene.ts` | M | port | 6 talk engines (build on #10664) | 1 | story: merge main; the address night's own arrival; the research record |
| `src/director/sitting.ts` | M | port | 2 address and the talk after it | 1 | words: the interview carries each side's own reason on the question (reason-for, reason-against from question- |
| `src/director/speech-builder.ts` | M | landed | - | 1 | same as train |
| `src/director/speech-outline.ts` | M | port | 2 address and the talk after it | 2 | story: the inaugural's facts from their engines, a planner test, guards green |
| `src/director/subject-tie.ts` | M | landed | - | 1 | same as train |
| `src/director/theme-words.ts` | A | port | 2 address and the talk after it |  | story: a speech's theme in the speaker's own wording, chosen by their traits (W1's trace of "how we _ through  |
| `src/director/veto-talk.ts` | M | port | 6 talk engines (build on #10664) | 1 | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/vote-ask-facts.ts` | M | landed | - | 1 | same as train |
| `src/director/who-they-are.ts` | M | landed | - | 1 | same as train |
| `src/english/conversation-words.ts` | M | port | 2 address and the talk after it | 1 | story: the talk after the address through the planner; one arrival line |
| `src/english/line-register.ts` | M | port | 1 outline planner, its banks and the sameness gate | 1 | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `src/english/loading-step-words.ts` | A | port | 3 person history and loading story |  | loading: dry progress lines from a loading-steps bank, said for the place being built |
| `src/english/mined/scene-bank.ts` | M | port | 2 address and the talk after it |  | story: the address night's arrival plays in every life; no stand that repeats the point |
| `src/english/outline-planner.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `src/english/question-names.ts` | M | port | 2 address and the talk after it |  | story: talk and the Journal evening get the question's plain words (said, to, reason-for, reason-against), so  |
| `src/english/scene-words.ts` | M | port | 2 address and the talk after it | 1 | story: the address night's arrival plays in every life; no stand that repeats the point |

### Words and data

| File | St | Decision | Piece | Recent | Why |
| --- | --- | --- | --- | --- | --- |
| `data/english/judged/later-replies-move-the-talk-on.json` | M | port | 6 talk engines (build on #10664) |  | story: home, arrival, family absence and office doubt say something (101 lines), with verdicts |
| `data/english/judged/later-replies-move-the-talk-on.yes.txt` | M | port | 6 talk engines (build on #10664) |  | story: home, arrival, family absence and office doubt say something (101 lines), with verdicts |
| `data/english/judged/narration-assumes-no-reason.json` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite (join-cause) now composes: narration, greets, requests, replies, follows and closes |
| `data/english/judged/narration-assumes-no-reason.yes.txt` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite (join-cause) now composes: narration, greets, requests, replies, follows and closes |
| `data/english/judged/no-quick-resolution.json` | M | port | 6 talk engines (build on #10664) |  | campaigning writer: judged verdicts for 3,810 reply pairs and 47 narration lines; cut four narration lines the |
| `data/english/judged/no-quick-resolution.yes.txt` | M | port | 6 talk engines (build on #10664) |  | campaigning writer: judged verdicts for 3,810 reply pairs and 47 narration lines; cut four narration lines the |
| `data/english/judged/replies-may-be-long-and-substantive.json` | M | port | 6 talk engines (build on #10664) |  | campaigning writer: judged verdicts for 3,810 reply pairs and 47 narration lines; cut four narration lines the |
| `data/english/judged/replies-may-be-long-and-substantive.yes.txt` | M | port | 6 talk engines (build on #10664) |  | story: the owner's order 1, lines: every bank line under the leave, deflect and stall reply moves deleted (332 |
| `data/english/judged/reply-follows.json` | M | port | 6 talk engines (build on #10664) |  | story: the owner's order 1, lines: every bank line under the leave, deflect and stall reply moves deleted (332 |
| `data/english/judged/reply-follows.yes.txt` | M | port | 6 talk engines (build on #10664) |  | story: the owner's order 1, lines: every bank line under the leave, deflect and stall reply moves deleted (332 |
| `data/english/judged/reply-second-move-follows-the-first.json` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite (join-cause) now composes: narration, greets, requests, replies, follows and closes |
| `data/english/judged/reply-second-move-follows-the-first.yes.txt` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite (join-cause) now composes: narration, greets, requests, replies, follows and closes |
| `data/english/judged/variants-differ-in-what-they-say.json` | M | port | 6 talk engines (build on #10664) |  | story: 146 more lines for first-meeting, first-day, last-day, layoff, job-offer and reach-out: narration, asks |
| `data/english/line-rules.json` | M | port | 6 talk engines (build on #10664) |  | story: no-day-or-place-in-narration also catches a typed weekday, month or year, not only a date slot (the own |
| `data/english/outlines.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `data/english/parts/campaign-standing.json` | M | port | 6 talk engines (build on #10664) |  | campaign-standing: who said yes and who is still asked, for the Volunteers and Endorsements screens |
| `data/english/parts/conversation.json` | M | port | 6 talk engines (build on #10664) |  | story: a second reply when the talk returns to a settled point |
| `data/english/parts/headlines.json` | M | port | 5 news and reach scope |  | story: the Journal's first evening and the address's news story through the planner |
| `data/english/parts/journal.json` | M | port | 4 journal |  | story: journal memoir moves deepened in place, 120 more lines across 27 moves |
| `data/english/parts/loading-steps.json` | A | port | 1 outline planner, its banks and the sameness gate |  | loading: dry progress lines from a loading-steps bank, said for the place being built |
| `data/english/parts/news.json` | M | port | 5 news and reach scope |  | story: the Journal's first evening and the address's news story through the planner |
| `data/english/parts/newscast.json` | M | port | 5 news and reach scope |  | story: a line that is nothing but the date or the place fails (no-line-that-only-restates-the-date, the owner' |
| `data/english/parts/opening-speech.json` | M | port | 2 address and the talk after it |  | story: the first evening's old pieces go (CTO, Nov 24, 7126444994) |
| `data/english/parts/outline-call.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `data/english/parts/outline-diary.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `data/english/parts/outline-journal.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the journal-chapter-open outline row and its bank |
| `data/english/parts/outline-loading.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the loading story in its own bank (outline-loading.json) |
| `data/english/parts/outline-local.json` | A | port | 1 outline planner, its banks and the sameness gate |  | Story writer (local speeches): outline-local.json, the mayor's address and campaign speech on the planner, 119 |
| `data/english/parts/outline-news.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `data/english/parts/outline-talk.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `data/english/parts/outline-theme.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `data/english/parts/outline.json` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the inaugural told through one outline planner, shapes from real inaugurals |
| `data/english/parts/person-history.json` | M | port | 3 person history and loading story |  | person history: sentences open on a stretch of life (in their teens, in their thirties) instead of a year or a |
| `data/english/parts/scene-talk.json` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite (join-cause) now composes: narration, greets, requests, replies, follows and closes |
| `data/english/parts/scene-words.json` | M | port | 2 address and the talk after it |  | story: merge main; the address night's own arrival; the research record |
| `data/english/pulled.json` | M | port | 1 outline planner, its banks and the sameness gate |  | story: home, arrival, family absence and office doubt say something (101 lines), with verdicts |
| `data/english/question-names.json` | M | port | 2 address and the talk after it |  | said: the budget lines carry a said name, and the six {said} lines no path reached play on {about} |
| `docs/story/coverage.md` | M | port | 7 elements and the guards on them (data only) |  | story: the issues field, its guard against the bill catalog, and the coverage map (docs/story/coverage.md) by  |
| `docs/story/elements/consequence/a-gift-comes-with-a-call-about-a-bill.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/consequence/close-count-ends-in-a-concession.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/consequence/forum-with-one-candidate-is-canceled.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/consequence/official-condemns-an-anonymous-mailer.json` | A | port | 7 elements and the guards on them (data only) |  | elements: the rival's mailer, four more |
| `docs/story/elements/consequence/petition-can-be-contested.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/consequence/petition-struck-names-decide-it.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/a-federal-contract-is-let-by-full-and-open-competition.json` | A | port | 3 person history and loading story |  | loading steps: cut to the 18 lines a real element stands behind, five new sourced elements for the rest |
| `docs/story/elements/detail/a-plant-closing-needs-advance-notice-under-the-warn-act.json` | A | port | 3 person history and loading story |  | loading steps: cut to the 18 lines a real element stands behind, five new sourced elements for the rest |
| `docs/story/elements/detail/a-price-index-follows-a-basket-of-what-people-buy.json` | A | port | 3 person history and loading story |  | loading steps: cut to the 18 lines a real element stands behind, five new sourced elements for the rest |
| `docs/story/elements/detail/ballot-box-seal-numbers-are-written-down.json` | A | port | 3 person history and loading story |  | loading steps: ballot boxes back, tied to a Georgia seal-number rule read this session |
| `docs/story/elements/detail/currency-is-ordered-from-the-treasurys-printer-each-year.json` | A | port | 3 person history and loading story |  | loading steps: cut to the 18 lines a real element stands behind, five new sourced elements for the rest |
| `docs/story/elements/detail/door-count-is-how-people-measure-effort.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/door-on-a-small-town-street.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/early-money-comes-from-people-you-know.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/federal-election-day-falls-on-a-fixed-tuesday.json` | A | port | 3 person history and loading story |  | loading steps: cut to the 18 lines a real element stands behind, five new sourced elements for the rest |
| `docs/story/elements/detail/filing-wrong-county-and-fee.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/most-states-start-their-fiscal-year-on-the-first-of-july.json` | A | port | 3 person history and loading story |  | loading steps: 37 lines tied to elements, every step has lines; three new sourced elements (census, district l |
| `docs/story/elements/detail/official-backs-incumbents-not-open-seats.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/detail/the-census-hands-each-state-its-population-for-redrawing-districts.json` | A | port | 3 person history and loading story |  | loading steps: 37 lines tied to elements, every step has lines; three new sourced elements (census, district l |
| `docs/story/elements/detail/the-constitution-orders-a-head-count-every-ten-years.json` | A | port | 3 person history and loading story |  | loading steps: 37 lines tied to elements, every step has lines; three new sourced elements (census, district l |
| `docs/story/elements/detail/volunteers-for-endorsed-candidates.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/moment/a-life-starts-among-the-brothers-and-sisters-already-there.json` | A | port | 3 person history and loading story |  | story: born lines for an older sibling, a first-born and an only child, and the element behind them |
| `docs/story/elements/moment/a-mailer-the-incumbent-says-he-never-saw.json` | A | port | 7 elements and the guards on them (data only) |  | elements: the rival's mailer, four more |
| `docs/story/elements/moment/concession-thanks-the-ones-who-worked.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/moment/door-lets-a-candidate-meet-neighbors.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/moment/empty-chair-gets-the-stage.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/moment/petition-the-hustle-before-the-deadline.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/moment/volunteer-comes-in-out-of-character.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/move/door-ask-is-what-should-the-office-do.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/move/member-asked-for-a-vote-stays-undecided-until-the-floor.json` | A | port | 7 elements and the guards on them (data only) |  | story: the restored not-yet answers tied to a sourced element (a member asked for a vote stays undecided until |
| `docs/story/elements/move/official-declines-to-endorse.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/move/volunteers-need-a-specific-ask.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/a-rivals-mailer-reaches-you-secondhand.json` | A | port | 7 elements and the guards on them (data only) |  | elements: the rival's mailer, four more |
| `docs/story/elements/situation/campaign-manager-is-someone-close.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/door-answer-is-frustration-with-the-body.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/family-asks-who-covers-the-kids.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/filing-at-the-clerks-counter.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/first-time-candidate-leads-fundraising.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/mayor-endorses-all-but-one.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/situation/petition-short-by-a-few-names.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/voice/campaign-manager-takes-it-personally.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/voice/candidate-calls-the-mailer-deceit.json` | A | port | 7 elements and the guards on them (data only) |  | elements: the rival's mailer, four more |
| `docs/story/elements/voice/candidates-skip-forums-out-of-discomfort.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/voice/door-neighbor-asked-by-neighbor.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/voice/family-is-a-sounding-board-and-a-risk.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/elements/voice/filing-the-first-time-is-new-to-the-clerk.json` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/story/first-evening-packet.md` | A | port | 2 address and the talk after it |  | story: the first-evening packet in three drawn places, and its pool item |
| `docs/story/writer-spec.md` | M | port | 8 skills, pointers, docs | 1 | story: the Story writers' spec |
| `src/director/data/arc-variants.json` | M | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/data/conversation-rules.json` | M | port | 6 talk engines (build on #10664) | 1 | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/data/opening-address.json` | M | port | 2 address and the talk after it |  | story: the addresses' rebuild, the planner side (the owner's grades P20, P25, P26): a section that opens a par |
| `src/director/data/purpose-arcs.json` | M | port | 6 talk engines (build on #10664) | 1 | Writer before: introduction and first-day-ropes arcs give four distinct stances; dead promise/confront lines d |
| `src/director/data/situation-types.json` | M | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/data/speech-outlines.json` | M | port | 2 address and the talk after it |  | story: a national address can name the country ({nation}, {nation-full}) |
| `src/director/data/stopgaps.json` | M | port | 6 talk engines (build on #10664) | 1 | story: the inaugural told through one outline planner, shapes from real inaugurals |

### Tests

| File | St | Decision | Piece | Recent | Why |
| --- | --- | --- | --- | --- | --- |
| `scripts/sameness/skeleton.test.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: a bank per Story writer, and the sameness gate in the repo |
| `src/bench/card-history-stretches.test.ts` | A | port | 3 person history and loading story |  | Card: a stretch of life is one telling, joining the records of its kinds |
| `src/bench/card-stretch.test.ts` | A | port | 3 person history and loading story |  | person history: a {then} slot says the stretch of life a thing happened in, with a test that every age has one |
| `src/bench/history-reader-proof.test.ts` | A | drop | - | 1 | the history reader |
| `src/bench/history-reader.test.ts` | A | landed | - |  | same as train |
| `src/bench/loading.browser.mjs` | M | port | 3 person history and loading story |  | story: the loading card tells the story only, whole, from the top |
| `src/bench/loading.test.ts` | M | port | 3 person history and loading story | 1 | story: the loading card tells the story only, whole, from the top |
| `src/bench/opening-landing.browser.mjs` | D | port | 2 address and the talk after it |  | story: the talk after the address through the planner; one arrival line |
| `src/core2/kin-elsewhere-past.test.ts` | M | landed | - |  | same as train |
| `src/core2/life-gaps.test.ts` | M | landed | - |  | same as train |
| `src/core2/past-race-lost.test.ts` | M | landed | - |  | same as train |
| `src/core2/past-work-names-every-employer.test.ts` | M | landed | - |  | same as train |
| `src/core2/whole-past.test.ts` | M | landed | - |  | same as train |
| `src/director/address-story.test.ts` | M | port | 2 address and the talk after it |  | story: the address-story played test checks the plan's story section and order, not the old composer's keys (C |
| `src/director/bribe-offer-scene.test.ts` | M | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/opening-address-kinds.test.ts` | M | port | 2 address and the talk after it |  | story: the first evening's old pieces go (CTO, Nov 24, 7126444994) |
| `src/director/reply-moves-removed.test.ts` | A | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `src/director/scene-talk.test.ts` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite and action-confront reworded for any cause, lie replies dropped, both scenes back in the s |
| `src/director/theme-words.test.ts` | A | port | 2 address and the talk after it |  | story: a speech's theme in the speaker's own wording, chosen by their traits (W1's trace of "how we _ through  |
| `src/english/least-recent-wording.test.ts` | M | port | 2 address and the talk after it |  | story: the first evening's old pieces go (CTO, Nov 24, 7126444994) |
| `src/english/outline-planner.test.ts` | A | port | 1 outline planner, its banks and the sameness gate |  | story: the inaugural's facts from their engines, a planner test, guards green |
| `src/english/stall-after-vote.test.ts` | D | port | 6 talk engines (build on #10664) |  | Replies: the leave, deflect and stall player moves are removed; sets work with fewer replies |
| `tests/guards/current-pointers-baseline.json` | M | port | 8 skills, pointers, docs | 1 | story: main merged; the replaced list keeps bank-elements.test.ts off it (it exists on this branch), the owner |
| `tests/guards/english/bank-elements.test.ts` | A | port | 7 elements and the guards on them (data only) |  | story: lines cite their elements; the draw count and drawn gate in the spec |
| `tests/guards/english/liked-lines-stay-baseline.json` | A | port | 7 elements and the guards on them (data only) |  | guard: lines the owner graded up stay in the banks |
| `tests/guards/english/liked-lines-stay.test.ts` | A | port | 7 elements and the guards on them (data only) |  | guard: lines the owner graded up stay in the banks |
| `tests/guards/english/line-inserts-baseline.json` | M | port | 6 talk engines (build on #10664) |  | story: the owner's order 1, lines: every bank line under the leave, deflect and stall reply moves deleted (332 |
| `tests/guards/english/line-register-baseline.json` | M | port | 1 outline planner, its banks and the sameness gate |  | Line register: count bank lines with no story element id, per bank, a baseline that only shrinks (#10432) |
| `tests/guards/one-history-proxies.json` | M | drop | - | 1 | the history reader |
| `tests/guards/one-history.test.ts` | M | drop | - | 1 | the history reader |
| `tests/support/scene-talk-fixture.ts` | M | port | 6 talk engines (build on #10664) |  | story: cause-invite and action-confront reworded for any cause, lie replies dropped, both scenes back in the s |

### Other

| File | St | Decision | Piece | Recent | Why |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/story-writer/SKILL.md` | M | port | 8 skills, pointers, docs | 1 | skills: story-writer gotcha, never revert a merge on a writer branch (Nov 25: a reverted merge undid the lead' |
| `.agents/skills/words-engine/SKILL.md` | M | port | 8 skills, pointers, docs | 1 | story: drop "The bill number was {designation}", and the empty-plan trap in words-engine |
| `.claude/skills/story-writer/SKILL.md` | M | port | 8 skills, pointers, docs | 1 | skills: story-writer gotcha, never revert a merge on a writer branch (Nov 25: a reverted merge undid the lead' |
| `.claude/skills/words-engine/SKILL.md` | M | port | 8 skills, pointers, docs | 1 | story: drop "The bill number was {designation}", and the empty-plan trap in words-engine |
| `data/content/trait-decisions.json` | M | port | 6 talk engines (build on #10664) |  | Arcs: the asked's not-yet answer is the undecided move (asks.carried), with its row in the decision table |
| `docs/CURRENT.md` | M | port | 8 skills, pointers, docs | 1 | story: the talk after the address through the planner; one arrival line |
| `docs/current.json` | M | port | 8 skills, pointers, docs | 2 | story: the talk after the address through the planner; one arrival line |
| `docs/design/daily-register.md` | M | landed | - |  | same as train |
| `docs/pool/items/story-first-evening.md` | A | port | 8 skills, pointers, docs |  | story: the first-evening packet in three drawn places, and its pool item |
| `docs/pool/items/world-opening-clock-reads-arrival-hour.md` | M | port | 2 address and the talk after it | 1 | story: the talk after the address through the planner; one arrival line |
| `docs/release/changes/elements-campaigning.md` | A | port | 7 elements and the guards on them (data only) |  | elements: campaigning, 31 |
| `docs/release/changes/history-card-home-purchases.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-journal-director.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-news-birthplaces.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-pages-dev-views-proof.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-past-races-bills.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-reader.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-results.md` | A | landed | - |  | same as train |
| `docs/release/changes/history-terms-bills-laws-century.md` | A | landed | - | 1 | same as train |
| `docs/release/changes/history-votes-and-losses.md` | A | landed | - |  | same as train |
| `docs/release/changes/story-first-evening.md` | A | port | 8 skills, pointers, docs |  | story: the theme said is the argued point's; the packet script |
| `docs/research/first-evening-2026-11-24.md` | A | port | 2 address and the talk after it |  | story: merge main; the address night's own arrival; the research record |
