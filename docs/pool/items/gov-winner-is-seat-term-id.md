---
id: gov-winner-is-seat-term-id
title: "A race's winner is a seat-term id, not a person"
area: elections
kind: bug
priority: 1
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "batch 11 defects; overnight Session C item 2"
---

**What.** The voting module's result must resolve to the person holding the term before anything reads it.

**Rules.** Ask why.

**Done when.** No scene or story prints an official:term:seat id as a winner in a drawn year.

**Files.** src/core2/modules/voting.ts, elections.ts

**Notes.** PR #4343 fixes the first defect in the engine; verify.

Checked Oct 15 by a Claude session: #4343 (draft, in-pr as gov-record-defects-finish) already rewrites this path in the same files (voting.ts winner resolution with voting-winner-person.test.ts; body names from office records). Building here would conflict, so this waits for that PR; verify the done-when line after it merges.

Checked Oct 17 (claude), after #4608 merged: in three drawn places (seeds w1, w2, w3: Connecticut, New York and Massachusetts towns) a played run to November 10, 2026 holds 18, 28 and 18 contests with 12, 22 and 13 results. The result row's `winnerId` is a person where the winner is a full person (`winningPersonId` resolves a term alias through the office's holder), but for the statewide and federal seats whose holder is not a full person it is still `official:term:seat:US-CT:governor:2025-01-20` and its kin. A reader that prints `winnerId` shows that id. The repair is on the reader's side: it must name the winner through `officialIdentity` (voting.ts about line 2886) as the winner scene already does; the director's election.result scene reads it that way. What remains is a test that no news line, scene or journal line in a drawn year carries the id, which needs the news composer over a played election; not built here.

Follow-up Oct 17 (claude): searched every reader of a winner id in `src/core2`, `src/director` and `src/english`. The `took-office` event carries `facts.winnerId` (voting.ts about line 2931, offices.ts line 1051), and nothing reads it: the journal row for `event:took-office` reads only the `office` fact, the director's `took-office` cause reads none, and the news and scene composers never name a winner from it. So no scene, news line or journal line prints a seat-term id in a drawn year today; the id would show only if a future reader printed the fact. The cheap guard is to carry the winner's name beside the id (the identity the new term already holds); until a reader needs it, recommend the CTO sets this item done.
