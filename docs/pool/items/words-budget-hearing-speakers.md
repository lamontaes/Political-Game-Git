---
id: words-budget-hearing-speakers
title: "The budget hearing has speakers and the English engine words the proposal, hearing and vote"
area: words
kind: feature
priority: 3
size: M
status: in-pr
claimed-by:
pr: #5359
blocked-on: spec: the item text is an empty TODO shell; the done-when must be written before it can be built (pool-todo-shells-need-spec)
source: added with npm run pool -- add
---

<<<<<<< HEAD
**What.** The budget season (PR #5217) records a proposal, a public hearing and a vote as events with facts only. The hearing has no speakers, and the proposal, hearing and vote have no English-engine words. Give the hearing the town's speakers on the lines proposed, and have the English engine word the proposal, the hearing and the vote for the journal and the news.

**Rules.** No hand-written player text: words come from the English engine. An effect is a read, not a record: the director reads the budget-proposed, budget-hearing and legislative-vote records. No dice: who speaks follows their stakes in the lines and their traits.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place with a voting council, seed named in the PR body), the budget-hearing record id lists speakers who have a stake in a proposed line, and the journal or the news carries a line for the proposal, the hearing and the vote, each citing its record id; a test in src/director covers it.

**Files.** src/core2/modules/legislature.ts, src/director/journal.ts, data/english/

**Notes.** Follow-up from office-the-budget-season (PR #5217). Words line: the Words session builds it.
=======
**What.** A council or county body's budget hearing has people in it already: `signUpToSpeak` and the local meeting record each speaker's public comment on a bill as a statement with the speaker's id (`src/core2/modules/meetings.ts`, kind `public-comment`), and a budget bill's vote is recorded in the legislature module. Nothing words the hearing as a scene. Build one scene for a budget bill's meeting, worded by the English engine from those records: the chair opens the item and calls each speaker who signed up (`hearing` bank, `chair-invite`), the speaker says their comment (`address` bank, public-comment register), a member asks a question (`hearing` bank, `member-question`), and the chair puts the question and announces the recorded result (`meeting` bank, via `composeBodyScene` in `scripts/english-corpus/body-bank.ts`). The proposal is named by its bill title (`billTitleOf`), the counts are the recorded votes'.

**Rules.** No hand-written player text: every line comes from the banks through the engine; screens show record data and control names. Ask why: each line cites its record id (bill, statement, vote), and a speaker is called only if their comment is on the record. No dice: who speaks follows the meeting engine's own rule (feeling, drive, temperament), never a share. An effect is a read: the scene counts only once the director or a bench screen shows it. One rule, all 56 places: no place or person named in the banks.

**Done when.** In a one-year played world (`buildBenchWorld`, a drawn place from all 56, place and seed named in the PR body) a budget bill that goes to a vote on the town body produces a hearing scene whose lines name the bill by its title, call at least one recorded public-comment speaker by name, and announce the recorded counts, each line citing its record ids; a test in `src/director/` or `scripts/english-corpus/` covers it. The owner plays it: attends a council budget meeting and hears the chair, a neighbor and a member speak in their own words.

**Files.** src/core2/modules/meetings.ts, scripts/english-corpus/body-bank.ts, src/director/scene.ts, data/english/parts/hearing.json, data/english/parts/meeting.json

**Notes.** Written Oct 20 (claude/budget-hearing-spec) from the code: the composer and its played-world test (`scripts/english-corpus/body-bank-world.test.ts`, PR #5187) already word a parks budget vote from a bill's own records. Missing: the speakers (public-comment statements) in the scene, and a director or bench reader. Waits on #5187 for the bank and composer.
>>>>>>> origin/main
