---
id: words-speech-afterward-reply-moves-vote
title: "What you tell a candidate after their speech reaches your vote: the views engine reads the scene reply"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: "filed by the words-and-scenes lead, Oct 26, while answering the send-back on #6136"
lead: effects
claimed-at:
---

**What.** After a campaign speech heard in the room, the candidate comes over and asks for your vote (`speech-afterward`, #6136). The player's reply ("You've got my vote.", "I still don't see it your way.") is recorded as a `scene.reply` event, and the core's relationship writer reads it as time together with the candidate. Nothing reads the stance itself. A promise of a vote changes no vote intent, no impression of the candidate, and no later choice, so the reply is a record nobody else reads (AGENTS.md, "An effect is a read, not a record").

**Rules.** An effect is a read, not a record. No dice: the reply moves the listener's view or commitment by the views engine's existing heard-event amount, never a roll. Ask why: the impression cites the `scene.reply` record.

**Done when.** In a played world (buildBenchWorld) in a drawn place, a player's "You've got my vote." reply to `speech-afterward` is read by the views or campaigns engine as a recorded commitment or impression that cites the `scene.reply` record id, and the player's own ballot screen or a later scene reads it. This is shown by a test in src/core2 naming the place, the seed and both record ids.

**Time box.** 3 hours.

**Files.** src/core2/modules/campaigns.ts (impressions), src/core2/modules/views or the views engine's reader, src/director/purpose-scene.ts (read only)

**Notes.** Filed Oct 26 by the words-and-scenes lead. The words line does not edit the engines; lead effects.
