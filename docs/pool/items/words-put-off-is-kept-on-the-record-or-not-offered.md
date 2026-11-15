---
id: words-put-off-is-kept-on-the-record-or-not-offered
title: 'When the player says "Can I get back to you?", nobody ever comes back'
area: words
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-l6i8n1
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

**Fix.** Where the engine keeps the ask open, the asker comes back once from that row, on a day the record gives, with the Words lead's openings (Nov 15, 06:45Z, 07:50Z, 09:05Z): the opening fits what the put-off said (the reply's bank part, `scene-talk-rules.json` `callBack.said`, or a walk-off), and on the call back the player gets yes and no only. Debate (`meetings.ts`): the day before the eve the debate goes on without them. Interview (`press.ts`): the newsroom's next weekly pass. Job offer (`jobs.ts`): the offer's last day. Reporter before a vote (`press.ts` `keepPutOffComment`): the next day while the bill is still drafted; the stall is offered only then (`can-call-back`), and the call back's answer is the comment on the record first asked about. Each call back is a new record of the same kind with `again`, so its situation type repeats by cause. Offer of help and appointment offer keep nothing open, so their put-offs are deleted with the arcs' stall replies.

**Time box.** 3 hours, Opus.

**Rules.** No dice: the come-back day is read from the record. An effect is a read: the engine's open row is what brings the asker back. Lines by the Words lead, judged by M5.

**Done when.** In the played world (buildBenchWorld) at Shelby MS (seed pin-b:1) the player stalls a debate and an interview and puts off a second interview with a question and a walk-off; at Island Heights NJ (seed pin-job-call-back:0) three job offers are put off three ways; at Peter UT (seed pin-reporter-call-back:0) a reporter is put off about a bill. Each asker calls back once, named by record id, opening on what was said, with yes and no only, and the yes or no is the engine's own. Offer of help and the appointment offer offer no put-off. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/modules/meetings.ts, src/core2/modules/jobs.ts, src/director/purpose-scene.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/data/scene-talk-rules.json, src/director/data/director.json, src/core2/data/life/remembered.json, data/english/parts/scene-talk.json, src/director/put-off-call-back.test.ts (new), src/director/job-offer-call-back.test.ts (new), src/director/reporter-call-back.test.ts (new)

**Notes.** Filed by hand on the conflict-accuse follow-up branch, Nov 15. The reporter's-call thread touches the same pieces for rule 113; tell it before changing them.
