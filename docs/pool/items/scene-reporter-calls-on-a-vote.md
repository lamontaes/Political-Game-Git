---
id: scene-reporter-calls-on-a-vote
title: "A reporter calls a council member for comment on their vote, and what they say is in the next day's story"
area: director
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "words-and-scenes lead, Oct 27, scene web press pass (packet the-reporter-calls-for-comment)"
lead: director
milestone: play-first
claimed-at:
---

**What.** `press-interview` fires on an executive action, a veto override, an introduced item and a published interview, but not on a member's own vote. In local news, the vote is the call every council member gets. The packet `docs/design/scenes/from-life/the-reporter-calls-for-comment.md` (local news practice, newsroom and municipal league guides, calibration only) shows the exchange. The reporter asks why, and the official can answer on the record, send a statement, go off the record or decline. The story says which, including "did not return a call".

**Rules.** No dice: the call comes from the vote record (`bill-vote:<bill>:<office>`) the press printed or will print, never a chance. Ask why: the story's quote cites the reply record. Serves `scene-standard`: the reporter is cast from the outlet that covers the body.

**Done when.** In a buildBenchWorld drawn place (seed named), a full-person member's vote on a printed bill stages `press-interview` with the covering outlet's reporter, citing the vote record by id. The reply is a `scene.reply` record that the next printed story about that vote reads: a quote, "declined to comment", or "did not return a call" when the player left the scene. A test fails when the story ignores the reply.

**Time box.** 4 hours.

**You will see.** The phone rings after the vote: the paper wants to know why you voted the way you did, and the next day's story quotes you, or says you declined.

**Screenshot.** The call in the bench and the printed story after it, with place and seed.

**Files.** src/director/data/situation-types.json, src/core2/modules/press.ts, src/bench/printed-words.ts

**Notes.** The words for a written statement and for going off the record are on the words lead's branch (`words/web-press`).
