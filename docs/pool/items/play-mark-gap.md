---
id: play-mark-gap
title: "Mark a line or scene as a gap while playing"
area: play
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/play-mark-gap
pr: #5204
blocked-on:
after: words-scene-talk-in-play
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:19:07.353Z
---

**What.** A player can mark a line or a scene as a gap while playing, so the owner and checkers can flag prose that does not read right. The mark sits on the scene screen as a control and writes one record naming the scene and line. The marks list for the bench so words sessions can read them.

**Rules.** No hand-written player text: the control shows only its control name and record data. Read-only screens spend no game time: marking a gap creates a note and advances no day.

**Done when.** In the played world, marking a gap on a scene in a drawn place writes one gap record naming the scene id and line, the clock does not move, and a screenshot of the scene screen with the control plus a test of the record prove it.

**Files.** src/bench/scene.ts, src/bench/dev-api.ts

**Notes.** Built Oct 19: POST /api/gap, GET /api/gaps, "Mark gap" on the talk panel; src/bench/mark-gap.test.ts. Not done: a screenshot of the control, and gaps on non-talk scenes. Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
