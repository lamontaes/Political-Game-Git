---
id: words-job-lost-talk-how-things-are-and-second-turn
title: "A lost job's talk says how things are in town and takes one more turn after Looking yet"
area: director
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/words-job-lost-how-things-are
pr: 9298
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: Words lead rulings-2 (Nov 14, 2026, 06:42Z), rule 101 and depth, on PR 9122
checked: S2 2026-11-14
---

**What.** The Words lead's second read of the lost-job talk (/mnt/project-files/words-lead/8941/rulings-2.md) asks for two things that PR 9122 does not carry. First, the teller's second sentence says how the town's work is, such as "Nobody's hiring around here.", chosen by the town's jobs record for the trade and never said as a rate. Second, after "Looking yet?" the player is offered one more turn ("Where?" and "You'll find something.") with the lines in that file. The talk today stops after one exchange and says nothing of the town's work. Seen: a lost-job talk with a bad market and one with a good market say different second sentences, and "Looking yet?" leads to a second exchange.

**Cause.** Design: docs/design/words-machine.md, rule 101 of the Words lead. The talk has one exchange and no read of the town's jobs record; `jobLost` in `src/director/conversation.ts` does not read the level, and the conversation has no reply role that follows a `job-lost-back` answer.

**Built (S2, Nov 14).** The level is the town's unemployment against the country's from `townMetrics` and the macro months (the read behind `town_figure`), in the bands `jobLostTownBadRatio` and `jobLostTownGoodRatio`; the town's own record has no figure per trade, so the trade is not read. The level lines are `reason` pieces of `job-lost-say` keyed by `town-bad`, `town-middling`, `town-good`; the second turn is `dayTalk.secondTurn` plus the pieces under `job-lost-back` (answers) and `job-lost-back-back` (their reply). Seen: the telling's second sentence and the second turn in the played test at three places.

**Fix.** Read the level from the jobs engine's town record (the same read the conversation engine's `town_figure` wording uses), add it as a fact on the job-lost subject, add the Words lead's level lines as pieces that require it, add the "Where?" and "You'll find something." replies after the hope answer with their lines, and "Same kind of work" only when the trade is on the job record.

**Time box.** 4 hours, Opus.

**Rules.** No dice; no rate said aloud; every line from the Words lead's file as written.

**Done when.** At three drawn places (the three pinned in `job-lost-talk-played.test.ts`) a staged closure (as in `job-lost-talk-played.test.ts`) tells a second sentence matching the town's level and offers the second turn after "Looking yet?". A second session sees it in a played life.

**Waits on.** PR 9122 and the conversation engine (PR 9067) on the train.

**Files.** src/director/conversation.ts, data/english/parts/conversation.json, src/director/job-lost-talk-played.test.ts

**Notes.** The act "keep an ear out for me" (the player hearing of an opening and telling them) is removed from the lines in 9122; a later design item for it: Design: the player hears of a job opening and can tell the person; no act for it exists.
