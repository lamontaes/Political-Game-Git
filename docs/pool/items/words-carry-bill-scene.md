---
id: words-carry-bill-scene
title: "When the executive asks a member to carry their bill, it is a scene for the member"
area: words
kind: wiring
priority: 1
size: S
status: done
claimed-by: finisher/words-carry-bill-scene
pr: #6387
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The carry-bill scene, where someone comes in with a bill that needs a sponsor, waits on a project-request record nothing in play writes. The legislature already makes this ask: an executive who may not introduce a bill in their own name asks the member most inclined to carry it, and the member decides by their own position and the asker's standing (askToCarry). The ask is only returned to its caller, never recorded, so no scene can fire from it. This item has the legislature record the ask (naming the member and the asker, the policy, and whether the member carried it), the director size it for the member, and the carry-bill scene fire from it with the asker as the one who comes in. The talk names the bill by its number when the member filed it, or by its name from the policy when they did not.

**Rules.** Wire to the world: the scene fires from the legislature's own record of an ask it really made, read by the director, and the asker is the executive on that record. Ask why: the scene names its cause record, which names the policy and the member's answer. One rule, all 56 places: the test draws places from all 56 until one has an ask to a member who is a full person.

**Done when.** src/director/carry-bill-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, watches the town's legislators and shows each carry-asked record for a watched member firing the member's carry-bill scene with the asker on the record as the member who asks, composed in the lines that play with a bill fact citing the record id.

**Files.** src/core2/modules/legislature.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/director/carry-bill-scene.test.ts

**Notes.** Builds on the branch of words-vote-confirmed-scene (#5977), which carries the debate and staff-news scenes and the rest of the chain.

Sent back 2026-10-26 from PR #6007 (branch words/carry-bill-scene): Declared stack parent #5977 remains open and unmerged, carrying #5975 and #5965; land the parent or isolate the child on main, and update the Done-when evidence to disclose its direct proposeAsExecutive fallback.; finish on that branch, merge main into it first.
