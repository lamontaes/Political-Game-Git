---
id: play-stop-22-election-win-never-shown-b
title: "The next day the Journal, News and Government each say whether you won"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-22-election-win-never-shown-a
source: added with npm run pool -- add
---

**What.** After the win in the playtest, the Journal still said "I ran for Council member.", News had no election story, Who you are showed no seat and Government listed the old council. The result never left the results record. This part makes the next day's Journal, News and Government read the player's result.

**Rules.** The chain is the acceptance: the result record reaches the journal, the news and the Government screen by record id. No hand-written player text: the journal and news lines come from the English engine.

**Done when.** In a drawn place, the day after an election the player ran in, the Journal, News and Politics → Government each show the player's result, each citing the same contest record id, shown by a screenshot of all three.

**Files.** src/bench/story.ts, src/bench/government.ts, src/director/journal.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-22-election-win-never-shown (Oct 24, lane). Journal and news words are the Words lead's (`needs-from: words`). Read PR #5914 (household scenes on a win or loss). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
