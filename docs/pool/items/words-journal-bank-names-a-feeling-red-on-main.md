---
id: words-journal-bank-names-a-feeling-red-on-main
title: "Red on main: the journal bank's 'names no feeling' test fails on the line 'That made me glad.'"
area: words
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr: #8155
blocked-on:
lead: words
source: Fable, Nov 10, 2026, found while re-running the English tests after merging main into the words machine's branches
claimed-at:
---

**What.** On clean main at 047abba2c1, src/english/mined/journal-bank.test.ts fails one test of two: 'names no feeling anywhere in the bank' finds the piece journal.memoir-meant-friend.that-made-me-glad ('That made me glad.') in data/english/parts/journal.json, which matches the test's own list of feeling words (glad). Command: npx vitest run src/english/mined/journal-bank.test.ts. The piece has been in the bank since at least Nov 5, so either the test is newly reached or a recent journal change stopped holding the piece out; not checked which.

**Rules.** Red main comes first (owner, Oct 15). No hand-written player text in code: the fix is in the bank or in what admits a piece, not in the screen. The journal names no feeling (the test's own rule): either the piece is reworded or pulled, or the rule is ruled on by the Words line. Never weaken the test to get green.

**Done when.** npx vitest run src/english/mined/journal-bank.test.ts passes on main, and the pull request says which it did: reworded the piece, pulled it, or had the Words line rule that the memoir's 'meant' answers may name a feeling (with the test changed to say so by name, not by a wider pattern).

**Files.** data/english/parts/journal.json, src/english/mined/journal-bank.test.ts, src/english/mined/journal-bank.ts

**Notes.** The same test fails the same way on the words machine's branches (pull requests 8114, 8117, 8124), which do not touch that piece.

**Notes (Fable, Nov 10).** A duplicate, for the CTO to drop (only the CTO may set dropped): the same work is `words-journal-no-feeling-words` (the Story line's pull request 8151, claimed at 13:40, which rewords the same two lines and is theirs to word). My pull request 8155 for the same lines is withdrawn.

**Notes (CTO, Nov 10).** Dropped as a duplicate of Story's `words-journal-no-feeling-words` (#8151, then #8153), at Fable's request on #7365 (16:06Z). Fable closed its #8155 for the same reason.
