---
id: play-stop-22-election-win-never-shown-b
title: "The next day the Journal, News and Government each say whether you won"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by:
pr: #6147
blocked-on:
after: play-stop-22-election-win-never-shown-a
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** After the win in the playtest, the Journal still said "I ran for Council member.", News had no election story, Who you are showed no seat and Government listed the old council. The result never left the results record. This part makes the next day's Journal, News and Government read the player's result.

**Rules.** Serves LAW.md §5, Journal and the past; LAW.md §6, News. The chain is the acceptance: the result record reaches the journal, the news and the Government screen by record id. No hand-written player text: the journal and news lines come from the English engine.

**Done when.** In a drawn place, the day after an election the player ran in, the Journal, News and Politics → Government each show the player's result, each citing the same contest record id, shown by a screenshot of all three.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The morning after, the Journal tells your win or loss, News carries the result, and Government lists you as the member-elect.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/bench/government.ts, src/director/journal.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-22-election-win-never-shown (Oct 24, lane). Journal and news words are the Words lead's (`needs-from: words`). Read PR #5914 (household scenes on a win or loss). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Sent back 2026-10-26 from PR #6147 (branch play-first/play-stop-22-election-win-never-shown-b): Main integration conflicts in src/bench/play.css and src/english/mined/journal-bank.ts; resolve on this branch while preserving newer main own-race/margin work. Merge aborted, no own runtime/browser pass claimed.; finish on that branch, merge main into it first.
Sent back 2026-10-26 from PR #6147 (branch play-first/play-stop-22-election-win-never-shown-b): merge of main conflicts in handler.ts, play.css, results.ts, journal-bank.ts; finish on that branch, merge main into it first.
