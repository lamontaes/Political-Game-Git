---
id: words-desk-bill-scene
title: "A bill on the player's desk is a scene: their aide, or the clerk, brings it to sign or veto"
area: words
kind: wiring
priority: 1
size: S
status: in-pr
claimed-by:
pr: #5953
blocked-on:
after: words-bargain-scenes
source: added with npm run pool -- add
claimed-at: 
---

**What.** When a passed bill waits on the player's desk as mayor, county executive, governor or president, the legislature puts it in a desk table and the office day stops the player, but no record says the bill was presented, so the director never stages the desk-bill scene; its cause waits on a producer. Presentment of a bill to the executive is a public record in every state and town. This item has the legislature record the presentment, the director size it for the executive, and the desk-bill scene fire from it with the executive's own aide from the staff module, or the clerk where the executive has no aide, the talk naming the bill from the record.

**Rules.** Wire to the world: the scene fires from the legislature's own presentment record, read by the director, with no invented ask. Ask why: the scene names its cause record, and its bill comes from that record. One rule, all 56 places: the test draws places from all 56 until one whose mayor has a veto under state law.

**Done when.** src/director/desk-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, makes the town's mayor the player, has the council pass a bill, and shows the bill-presented record firing the mayor's desk-bill scene with an aide or the clerk, composed with the bill's number and citing the record id.

**Files.** src/core2/modules/legislature.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/civic-roles.ts, src/director/desk-scene.test.ts

**Notes.** TODO

Sent back 2026-10-24 from PR #5953 (branch words/desk-scene): new desk-scene.test.ts:27 and carried bargain/purpose source comments and producer-data note embed dated owner instructions prohibited by the merger morning check; retain that history in docs; finish on that branch, merge main into it first.
