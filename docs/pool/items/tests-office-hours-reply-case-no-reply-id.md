---
id: tests-office-hours-reply-case-no-reply-id
title: "An office-hours reply settles the case but the case row keeps no reply id, at all three pinned towns"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Civic roles builder, Nov 15, src/director/office-hours-reply-case.test.ts red on the clean Train 29ef4685"
model: sonnet
effort: medium
---

**What.** `src/director/office-hours-reply-case.test.ts` fails at all three of its pinned towns on the clean Train head 29ef4685: the case is settled, but its `replyId` is undefined where the test expects the scene reply's id. Taylors, South Carolina (4571395), seed office-hours-a: `office-approached:case:person_3c42479e2eacee44:2025-02-19: expected undefined to be 'scene-reply:official:term:seat:US-SC:…'`. Kandiyohi, Minnesota (2732372), seed office-hours-f, and Donnelly, Idaho (1622330), seed office-hours-c, fail the same way. Seen: in the case row a player's office-hours reply settles, which no longer cites the reply.

**Cause.** Needs cause. The cases engine's `onEvent` in src/core2/modules/constituent-cases.ts calls `handleCase` without the reply id, while `handleCase` takes one as its fifth argument; the first place to look is whether the scene.reply event's own id reaches it.

**Fix.** None until the cause is found.

**Time box.** 1 hour, Sonnet.

**Rules.** Ask why: the case row names the reply that settled it, by record id.

**Done when.** At the three pinned towns above, the test passes on a played world built with buildBenchWorld, and a second session sees a settled case cite its reply in a drawn place it names with its seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/director/office-hours-reply-case.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. Not caused by the office hours words PR: red at the same three places on the clean Train.
