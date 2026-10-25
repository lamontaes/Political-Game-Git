---
id: pool-todo-shells-need-spec-oct19b
title: "More priority-2 pool items are empty TODO shells: words-director-watches-officeholders, world-counted-renters-buy, gov-standins-housing, words-speech-voices, words-housing-moved-lines"
area: docs
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr: #5217
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5283 (branch claude/pool-shell-specs): The diff edits eight pool specifications but contains no docs/release/changes declaration. Add the required impact-none declaration for the actual docs-only change, verify the eight-item list against the final diff, merge main and run changed-file checks.; finish on that branch, merge main into it first.

Oct 21 (claude): superseded on main. All eight items #5283 edits (jobs-entry-requirement-by-occupation, jobs-occupation-entry-experience, justice-discrimination-complaint, people-interview-screen, people-partnerships-counted-and-rates, people-partnerships-full-people-end, people-partnerships-full-people-form, world-hiring-discrimination-ban-refusal) now have What, Rules, Done when and Files on main, written since #5283 and fuller than its versions (people-interview-screen, for one, names press.ts's requestInterview, interviewQuestions and answerInterview). `npm run pool -- --check` exits clean on main. #5283 carries only older text and its merge with main conflicts on each file, so it should be closed and this item marked done by a CTO; nothing is left to build.
