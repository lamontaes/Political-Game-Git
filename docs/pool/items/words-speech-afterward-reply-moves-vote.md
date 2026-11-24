---
id: words-speech-afterward-reply-moves-vote
title: "What you tell a candidate after their speech reaches your vote: the views engine reads the scene reply"
area: words
kind: wiring
priority: 2
size: S
status: merged
claimed-by: claude/pool-words-speech-afterward-reply-moves-vote
pr: #8596
blocked-on:
source: "filed by the words-and-scenes lead, Oct 26, while answering the send-back on #6136"
lead: effects
claimed-at: 2026-11-11T04:43:46.115Z
after:
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
merged-at: 2026-11-12T20:08:19.260Z
---

**What.** After a campaign speech heard in the room, the candidate comes over and asks for your vote (`speech-afterward`, #6136). The player's reply ("You've got my vote.", "I still don't see it your way.") is recorded as a `scene.reply` event, and the core's relationship writer reads it as time together with the candidate. Nothing reads the stance itself. A promise of a vote changes no vote intent, no impression of the candidate, and no later choice, so the reply is a record nobody else reads (AGENTS.md, "An effect is a read, not a record").

**Cause.** Found in code: the speech-afterward reply is recorded as scene.reply (replyInScene, src/director/purpose-scene.ts, line 1700) and the relationship writer reads it only as time together; the campaigns engine routes scene.reply to answerOffer (src/core2/modules/campaigns.ts, line 2468), which reads only volunteer offers, and src/core2/modules/views.ts does not read it, so the stance changes no vote intent or impression.

**Fix.** Have the campaigns or views engine read an agreeing reply to speech-afterward as a commitment or impression by the views engine's existing heard-event amount, citing the scene.reply record id.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record. No dice: the reply moves the listener's view or commitment by the views engine's existing heard-event amount, never a roll. Ask why: the impression cites the `scene.reply` record.

**Done when.** A second session, not the builder, runs a test in src/core2 in a drawn place (buildBenchWorld, place and seed named) where the player replies "You've got my vote." to speech-afterward and sees the views or campaigns engine record a commitment or impression citing the scene.reply record id, then sees the player's ballot screen or a later scene read it; both record ids are named.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/views.ts, src/director/purpose-scene.ts

**Notes.** Filed Oct 26 by the words-and-scenes lead. The words line does not edit the engines; lead effects.
