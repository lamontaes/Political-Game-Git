---
id: people-words
title: "Words:"
area: people
kind: feature
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
milestone:
source: "docs/coordination/OPUS-PEOPLE.md line 19 (unchecked checklist line)"
claimed-at: 2026-10-19T21:55:12.861Z
---

**What.** Two Words pieces remain from the press work: the interview lines (reporter questions as plain, further, turn, brief and the lie) and the printed-story row in bring-it-up (SG-PEOPLE-press-bring-it-up-row). The bank for interviews is `data/english/parts/interview.json` and the bring-it-up rows are `src/director/data/bring-it-up-rows.json`. PR #4156 (as of 2026-10-15) has no pool item; check whether it has merged. The player would notice a reporter asking real questions and neighbors mentioning what the paper printed.

**Rules.** No hand-written player text: all lines come from the English banks, authored with origin or mined from public-domain sources with source recorded; none typed into code; An effect is a read, not a record: the interview reads the candidate's record and the reporter's outlet, and bring-it-up reads the `printed:` fact; Ask why: each line cites the story or record it came from; No dice: who asks and what they ask follows the reporter's traits and the record, not a roll; Research before building: mined lines are public-domain with the source kept; American English: spellings follow `tests/american-english-sweep.test.ts`; Placeholders: SG-PEOPLE-press-bring-it-up-row closes with the row.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a candidate's interview in the year composes its questions and answers through the engine (outlet and interview ids named), and a reader brings up a printed story with the outlet named. Tests in `tests/english-parts-banks.test.ts` and `src/director/bring-it-up.test.ts`, and the lines graded in the next words batch. The owner plays it: gives an interview and hears the paper mentioned later.

**Files.** data/english/parts/interview.json, data/english/parts/bring-it-up.json, src/director/data/bring-it-up-rows.json, src/core2/press-desk.ts

**Notes.** Checklist line from OPUS-PEOPLE.md; verify against main before starting.
