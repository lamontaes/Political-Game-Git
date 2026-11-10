---
id: play-campaign-acts-as-scenes-part-3-own-money-as-a-scene
title: "Putting in your own money is a scene with the treasurer"
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
---

**What.** Put in your own money is a button on the campaign trail card. It becomes a scene with the campaign treasurer in which the player chooses the amount and whether it is a gift or a loan, and the same money record is written as the button wrote. This is the last of the three acts, so it also closes the registered stopgap SG-PLAY-campaign-acts-buttons.

**Cause.** Found in code: the `case "contribute"` of the campaign act handler in src/bench/campaign.ts (line 314) moves the player's own money with the amount they chose and returns answers with no `scene`, while the volunteer and ad cases return `scene: askScene(core, personId, scenePlaces...)`; SG-PLAY-campaign-acts-buttons in src/core2/data/stopgaps/play.json (line 303) lists Put in your own money as still a button.

**Fix.** Add a treasurer's place row to src/bench/data/scene-places.json, return `scene: askScene(...)` and the answers (name and line) from the contribute case, start it through `playAsks` in src/bench/play.mjs like the ad scene, delete the button, and when Poll and Mail have also landed mark SG-PLAY-campaign-acts-buttons resolved and delete the row's marker in src/bench/play.mjs. Bank pieces for the scene go to the Words session.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Scene standard: a scene writes something back. One engine: the act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button is deleted with the scene. No hand-written player text: the scene's lines come from bank pieces added by the Words session. Review: words. The money moves through the campaign's own account and the journal.

**Done when.** A second session, in a played world in a drawn place (named with its seed), starts Put in your own money from the campaign trail and sees a scene with the treasurer, then the same money record the button wrote (named by record id) with the player's cash lower and the campaign's higher by the same amount, finds no such button on the trail card, and, once the other two acts have landed, finds SG-PLAY-campaign-acts-buttons resolved.

**Waits on.** The Words session's bank pieces for the treasurer scene. The stopgap closes only after parts 1 and 2 also land.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/scene-places.json, src/core2/data/stopgaps/play.json, data/english
