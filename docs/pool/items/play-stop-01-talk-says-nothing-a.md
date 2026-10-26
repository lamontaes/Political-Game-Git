---
id: play-stop-01-talk-says-nothing-a
title: "Talk at home opens from the moment and offers four replies that move it"
area: words
kind: bug
priority: 1
size: M
status: done
claimed-by: words/play-stop-01-talk-a
pr: #6078
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T18:15:07.367Z
---

**What.** On the v0.22.10 release, Talk with my father, my mother or a sibling gave one closing line ("Talk to you soon.", "See you later.") and no replies at all. The owner's rulings say a talk starts from the place and the occasion, then from the biggest recorded event of either person, and always offers four replies ranked by the engine. This part makes the talk box show the opener and the four replies the conversation engine returns, and makes each reply change what the player sees next.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §7, Words that ship. This is a game, not a spreadsheet: meeting people and talking is golden-path step 2, so a talk must give the player four real things to say. No hand-written player text: the opener and the replies come from the English engine and the people's records.

**Done when.** In a drawn place on the first evening at home, Talk with a household member shows an opener drawn from their record or the day and four numbered replies, and choosing one shows the other person's answer and four new replies.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Talking to your mother on the first evening, she opens from something in her own life or the day, and you have four numbered replies that each move the talk on, with Say nothing and Leave small beneath them.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/handler.ts, src/director/conversation.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-01-talk-says-nothing (Oct 24, lane). The conversation engine is the Words lead's (src/director, src/english, data/english): the lane builds the screen side and writes `needs-from: words` for any engine change. Read PR #5914 (household scenes in play) first. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
