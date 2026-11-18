---
id: tests-office-hours-reply-case-no-reply-id
title: "An office-hours reply settles the case but the case row keeps no reply id, at all three pinned towns"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
root: none
claimed-by: claude/long-game-office-hours-reply-id
pr: #9882
after:
blocked-on:
lead: words
source: "Civic roles builder, Nov 15, src/director/office-hours-reply-case.test.ts red on the clean Train 29ef4685"
model: sonnet
effort: medium
---

**What.** `src/director/office-hours-reply-case.test.ts` fails at all three of its pinned towns on the clean Train head 29ef4685: the case is settled, but its `replyId` is undefined where the test expects the scene reply's id. Taylors, South Carolina (4571395), seed office-hours-a: `office-approached:case:person_3c42479e2eacee44:2025-02-19: expected undefined to be 'scene-reply:official:term:seat:US-SC:…'`. Kandiyohi, Minnesota (2732372), seed office-hours-f, and Donnelly, Idaho (1622330), seed office-hours-c, fail the same way. Seen: in the case row a player's office-hours reply settles, which no longer cites the reply.

**Cause.** Found in code: two calls settle the case from one reply. The cases engine's `onEvent` (src/core2/modules/constituent-cases.ts:109-119) reads the `scene.reply` event and calls `handleCase` with no reply id; it runs as the reply is recorded, so it settles the case first. The scene's own call (`handleCase(..., id)` in src/director/purpose-scene.ts:3598) then finds the case no longer open and does nothing, so the row never cites the reply.

**Fix.** `onEvent` passes the event's own id (the scene.reply record) to `handleCase` as the reply that settled the case. The test draws its places (CTO, Nov 17), until two have played a reply that helps, naming each place it passes over.

**Time box.** 1 hour, Sonnet.

**Rules.** Ask why: the case row names the reply that settled it, by record id.

**Done when.** src/director/office-hours-reply-case.test.ts passes at drawn places and fails on main's code at the same seed; and a second session sees a settled case cite its reply in a drawn place it names with its seed. (The three pinned towns were the done-when until the CTO's Nov 17 rule put tests back on drawn places.)

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/director/office-hours-reply-case.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. Not caused by the office hours words PR: red at the same three places on the clean Train.

Long game, Nov 17: at main's own pinned test, Taylors fails on main ("expected undefined to be 'scene-reply:…'") and passes with the fix; Kandiyohi and Donnelly now fail on both codes because no resident visits an official there in 45 days, which the drawn test passes over by name.
