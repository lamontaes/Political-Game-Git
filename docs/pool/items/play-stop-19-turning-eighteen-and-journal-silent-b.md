---
id: play-stop-19-turning-eighteen-and-journal-silent-b
title: "The journal tells filing and turning 18 as part of the story, in the right tense"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-19-turning-eighteen-and-journal-silent-a
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release the journal stayed blank for three weeks, then said "I ran for Council member.", past tense, 21 months before the election. The owner's rulings make the journal a memoir where deciding to run is an entry and no entry is a lone event. This part words the filing entry and the 18th birthday entry so each carries its subject and sits inside the player's story.

**Rules.** No hand-written player text: journal lines come from the English engine from the record. This is a game, not a spreadsheet: an entry tells a moment in the player's life, never a log line.

**Done when.** In a drawn place, after turning 18 and filing, the Journal shows an entry naming the office filed for and the coming election, in a tense true on that date, and the birthday inside the story, shown by a screenshot.

**Files.** src/director/journal.ts, src/bench/story.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-19-turning-eighteen-and-journal-silent (Oct 24, lane; the work order's journal half). Journal words are the Words lead's (`needs-from: words`). See play-first-10-journal-from-day-one. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
