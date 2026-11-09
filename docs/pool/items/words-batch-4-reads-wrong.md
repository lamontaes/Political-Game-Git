---
id: words-batch-4-reads-wrong
title: "Lines that read wrong once the game fills them, found by playing batch 4's scenes: wrong slot, wrong room, wrong article, generic talk"
area: words
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
milestone: play-first
source: "batch 4 capture, Nov 9 (docs/coordination/batches/2026-11-09-batch-4.md, Reads wrong in play)"
claimed-at:
---

**What.** Playing twenty scenes through the game's own functions for batch 4 showed lines that read wrong once filled. The news talk's `{topic}` slot is filled with an outlet's name ("Did you hear about New Albany Times?"), at a letter and at a birth. Office hours, a one-on-one, draws town-hall beats (a heckler, a squealing microphone, a moderator, "Next question."). A narration line contradicts the arrival line's room (the arrival puts both people in the chamber, then the player is "at your desk" behind an open door; an apology arrives "at the house", then "After the meeting ... the room is nearly empty"). The office drops its article ("running for Council member", "the work of commissioner"). An address promises a reason it never gives ("I trust Vice President James Johnson. You'll see why."). A trade's refusal does not answer the trade ("That's not mine to give." after "I'll need your vote on mine"). Letters and news of a death or a birth play the generic news talk; #8068 gives letters a purpose and #7909 gives news a purpose, so check those after they merge.

**Rules.** No hand-written player text: each fix is a bank piece's gate (its setting, its fact, its role) or the renderer's slot, never a typed sentence in code. Wire to the world: the topic slot reads the news record's own subject, and a beat reads the scene's setting from the record that staged it.

**Done when.** Each row of the batch 4 "Reads wrong in play" list is fixed or explained; `npx tsx scripts/dialogue-batch/batch-four.ts --world 0` (and 1, 2) re-run on main after the fix, in the same drawn places and seeds, shows none of these lines; a test per fix in src/director or src/english reads the line in a played world.

**Files.** data/english/parts/scene-talk.json, data/english/parts/conversation.json, src/director/scene.ts, src/director/conversation.ts

**Time box.** 3 hours.

**You will see.** Office hours without a microphone, letters that ask what a letter asks, and offices named with "a" and "the".

**Screenshot.** The re-run batch 4 tree for the same scenes.
