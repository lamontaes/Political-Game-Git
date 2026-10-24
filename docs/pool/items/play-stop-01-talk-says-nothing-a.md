---
id: play-stop-01-talk-says-nothing-a
title: "Talk at home opens from the moment and offers four replies that move it"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release, Talk with my father, my mother or a sibling gave one closing line ("Talk to you soon.", "See you later.") and no replies at all. The owner's rulings say a talk starts from the place and the occasion, then from the biggest recorded event of either person, and always offers four replies ranked by the engine. This part makes the talk box show the opener and the four replies the conversation engine returns, and makes each reply change what the player sees next.

**Rules.** This is a game, not a spreadsheet: meeting people and talking is golden-path step 2, so a talk must give the player four real things to say. No hand-written player text: the opener and the replies come from the English engine and the people's records.

**Done when.** In a drawn place on the first evening at home, Talk with a household member shows an opener drawn from their record or the day and four numbered replies, and choosing one shows the other person's answer and four new replies.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/handler.ts, src/director/conversation.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-01-talk-says-nothing (Oct 24, lane). The conversation engine is the Words lead's (src/director, src/english, data/english): the lane builds the screen side and writes `needs-from: words` for any engine change. Read PR #5914 (household scenes in play) first. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
