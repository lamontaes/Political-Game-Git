---
id: play-campaign-acts-as-scenes-part-2-mail-as-a-scene
title: "Mail starts as a scene at a printing place"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
source: split from play-campaign-acts-as-scenes in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Mail is a button on the campaign trail card. It becomes a scene at a printing place where the player decides what to mail and how much to spend, and the same mailer record is written as the button wrote (mailers to the town's next households, as many as the amount buys, never past what the campaign holds). Each act keeps its existing handler and record; only how it starts changes. The button is deleted with the scene.

**Cause.** Found in code: the `case "mail"` of the campaign act handler in src/bench/campaign.ts (line 375) calls `sendMail` and returns a summary with no `scene`, while the volunteer and ad cases return `scene: askScene(core, personId, scenePlaces...)`; the button is drawn in src/bench/play.mjs (about line 1859, `controls.campaignActs.mail`); SG-PLAY-campaign-acts-buttons in src/core2/data/stopgaps/play.json (line 303) lists Mail as still a button.

**Fix.** Add a printing place row to src/bench/data/scene-places.json, return `scene: askScene(...)` and the answers (name and line) from the mail case, start it through `playAsks` in src/bench/play.mjs like the ad scene, delete the Mail button, and update SG-PLAY-campaign-acts-buttons. Bank pieces for the scene go to the Words session.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Scene standard: a scene writes something back. One engine: the act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button is deleted with the scene. No hand-written player text: the scene's lines come from bank pieces added by the Words session. Review: words.

**Done when.** A second session, in a played world in a drawn place (named with its seed), starts Mail from the campaign trail and sees a scene at a printing place with people on screen, then the same mailer record the button wrote (named by record id) and the amount spent moved on the campaign's account, and finds no Mail button on the trail card.

**Waits on.** The Words session's bank pieces for the mail scene.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/scene-places.json, src/core2/data/stopgaps/play.json, data/english
