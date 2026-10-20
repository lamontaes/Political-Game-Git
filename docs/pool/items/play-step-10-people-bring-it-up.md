---
id: play-step-10-people-bring-it-up
title: "Golden path step 10: people bring up a law that took effect"
area: play
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4887
blocked-on:
source: added with npm run pool -- add
---

**What.** Golden-path step 10 (a law the player passed takes effect, the town reads about it, people bring it up) never happened. The press prints a story when a law takes effect, but the news module emitted its read event only for stories that argue a side on a policy question, and a law's amount (the minimum wage) is not one; and a reader could only bring up a story whose topic the bill catalog names, which a law series is not. A story about a law taking effect is now read and remembered by its outlet's followers with no side taken, the English data's name for a law's amount ("the minimum wage") is the subject a reader says, and `reachedSteps` reports step 10 when someone in town has read the story about a law the player's bill made. `path-check.ts` lives three months past the law to reach it.

**Rules.** An effect is a read, not a record: the read event is what a person remembers and brings up, not a table. No hand-written player text: the subject comes from the authored English data (bill-sections), the line from the existing bring-it-up banks. The chain is the acceptance: law took effect, story printed, a reader remembers it, the reader says it. One rule, all 56 places: the check draws places and names them.

**Done when.** `GOLDEN_PATH_SEED=pc-d node --import tsx src/bench/path-check.ts` reports step 10 (Deer Island, Oregon: the player's county minimum-wage law took effect December 17, 2026), and a test in src/director (bring-it-up-law.test.ts) finds, in a drawn place, a reader of a printed story about a law taking effect who brings it up naming the law's subject and the outlet, tied to the read event by record id.

**Files.** src/core2/modules/news.ts, src/director/question-names.ts, src/director/bring-it-up.ts, src/bench/reached.ts, src/bench/path-check.ts

**Notes.** Step 11 (the next election uses the record) is not detected yet. Only four law amounts have an authored subject (income tax, sales tax, minimum wage, public pay floor); other series and budget lines are read but cannot be spoken until the English data names them.
