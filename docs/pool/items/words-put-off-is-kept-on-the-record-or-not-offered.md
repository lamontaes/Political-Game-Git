---
id: words-put-off-is-kept-on-the-record-or-not-offered
title: 'When the player says "Can I get back to you?", nobody ever comes back'
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Words lead's page read at Salado TX (seed review1:2), class E, Nov 15, 2026; reporter's pairs from M4; cause traced by the short-replies builder
---

**What.** Put-offs are offered in four scenes: "Can I get back to you on that?" and "Let's talk another time." (offer of help), "Let me look at my week and call you back." and "Can I think about it?" (interview invitation), "Call me back later." (debate invitation), and in the reporter's call before a vote "Let me check and call you back today." and "Ask me next week, when there's more to say." Each says the talk will continue. The person never comes back. Seen: after a put-off, the Journal and the following weeks show nothing more from that person on that ask (Salado TX, P3, P5, P9, P27).

**Cause.** Found in code: the arcs end a stall in `thinking` with keeps `none` (`src/director/data/purpose-arcs.json`). The engines then differ:

- Interview (`press.ts` `answerInvitation`): a stall leaves the row `invited`, so the ask is open on the engine's own table. `already` stops the outlet asking again, and the weekly pass turns the silence into a refusal once the race is over.
- Debate (`meetings.ts` `answerDebateInvitation`): a stall leaves the row `invited` until `debateEve` holds the debate without the player. The record has a day, the debate's eve, and nobody calls before it.
- Offer of help (`campaigns.ts` `answerOffer`): a stall changes nothing and nothing keeps the offer open; the next offer comes from someone else a week on.
- Reporter's call (`press-comment`): no ending of a stall is kept (`promise-kinds.json` has none). The vote's date is on the bill.

No generic reader of earlier `scene.reply` endings exists, and the bill stages thread confirmed #9369's readers each read their own engine's table.

**Fix.** Where the engine keeps the ask open (interview, debate), the asker comes back once from that row. The call comes before the day the record names (the debate's eve; for an interview, the race's election date, ahead of the pass that counts silence as a no), with the Words lead's asked-before opening. No fixed count of days and no new table. For the reporter's call before a vote, the stall ending is kept as an open ask on the comment row, and the reporter calls back before the vote's date. "Ask me next week" is offered only when the vote is a week or more away. For the offer of help, nothing gives a day, so the put-off comes out of that scene and is deleted from the bank. Where a reader of earlier `scene.reply` endings is needed, it is written once beside the journal's (`journal.ts` `sceneEndingMoments`).

**Time box.** 3 hours, Opus.

**Rules.** No dice: the come-back day is read from the record. An effect is a read: the engine's open row is what brings the asker back. Lines by the Words lead, judged by M5.

**Done when.** In the played world (buildBenchWorld) at Salado TX (seed review1:2) and one place drawn from all 56 (named with its seed), the player stalls a debate invitation and an interview invitation. Each asker calls back once before the record's day, and the call is named by record id. The offer of help no longer offers a put-off. A test stages each stall through the scene's own reply. A second session sees it in the running game.

**Waits on.** The Words lead's call-back openings.

**Files.** src/core2/modules/press.ts, src/core2/modules/meetings.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/director/journal.ts

**Notes.** Filed by hand on the conflict-accuse follow-up branch, Nov 15. The reporter's-call thread touches the same pieces for rule 113; tell it before changing them.
