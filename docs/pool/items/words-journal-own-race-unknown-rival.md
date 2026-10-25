---
id: words-journal-own-race-unknown-rival
title: "The journal drops the player's own race when they never knew the rival by name"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Part of play-stop-22-election-win-never-shown (lead m0-m2), routed to the Words lead because src/director is theirs. In Oppelo, Arkansas (seed 71a58b38173c73955fd71f78a41a9025) the player lost their Commissioner race (contest:seat:gus2025:160858:board:0:2026-11-03) and the journal the next day read only 'I ran for Commissioner.'. Cause: composeJournal's factsFor (src/director/journal.ts) returns null when the moment's counterpart (the rival) is not someone the person knows by name, so a race against a stranger, won or lost, is never told; the own-race lines ('I won.', 'It wasn't close.') never name the rival. A tested fix exists: when the counterpart is unknown, keep the facts for a self-named moment whose row has an own line (patch: one added const before otherId, and 'if (!said) return moment.selfNamed && hasOwnLine ? facts : null;'), with two journal tests (an own win against a rival never known, an unopposed own win); with it the Oppelo journal reads 'It wasn't close.' sourced by election-result:contest:seat:gus2025:160858:board:0:2026-11-03. Also see journal-own-unopposed-win-silent.

**Rules.** No hand-written player text: the lines come from the bank. The chain is the acceptance: the result record reaches the journal by record id.

**Done when.** In a drawn place where the player runs against someone they never met, the journal the day after the count has a line sourced by the election-result record id, won and lost, named with place, seed and record id; journal tests pass.

**Files.** src/director/journal.ts, src/director/journal.test.ts

**Notes.** TODO
