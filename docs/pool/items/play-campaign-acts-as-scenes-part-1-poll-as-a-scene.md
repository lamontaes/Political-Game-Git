---
id: play-campaign-acts-as-scenes-part-1-poll-as-a-scene
title: "Poll starts as the pollster's briefing scene"
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

**What.** Poll is a button on the campaign trail card. It becomes a scene: the player meets the pollster for a briefing at a place, chooses the sample, and the same poll record is written as the button wrote. A first build exists on branch play-first/play-campaign-poll-scene at 82eb4dac0b (a poll case with a line and a scene, a pollsterBriefingPlace row, two poll-none bank pieces, src/bench/poll-briefing.browser.mjs) but it is not on main, and its check failed: after the player puts money in and reopens the card, the second Poll click gets no /api/campaign/act response. That branch may be gone; the work does not depend on it.

**Cause.** Found in code: the `case "poll"` of the campaign act handler in src/bench/campaign.ts (line 385) returns `commissionPoll(...)` with no `scene`, while the volunteer and ad cases return `scene: askScene(core, personId, scenePlaces...)` (lines 312 and 372); the button is drawn in src/bench/play.mjs (about line 1849); the registered stopgap SG-PLAY-campaign-acts-buttons in src/core2/data/stopgaps/play.json (line 303) lists Poll as still a button.

**Fix.** Add a `pollsterBriefingPlace` row to src/bench/data/scene-places.json, return `scene: askScene(core, personId, scenePlaces.pollsterBriefingPlace)` and the answers (name and line) from the poll case, start it through `playAsks` in src/bench/play.mjs like the ad scene, delete the Poll button, and update SG-PLAY-campaign-acts-buttons. Reproduce the second-click hang first (print the Poll button's disabled state and the card text before the second click) and fix its cause, not the check. Bank pieces for the scene go to the Words session.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Scene standard: a scene writes something back. One engine: the act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button is deleted with the scene. No hand-written player text: the scene's lines come from bank pieces added by the Words session. Review: words.

**Done when.** A second session, in a played world in a drawn place (named with its seed), starts Poll from the campaign trail and sees the pollster's briefing scene with people on screen, then the same poll record the button wrote (named by record id), presses Poll a second time after putting money in and gets an answer, and finds no Poll button on the trail card.

**Waits on.** The Words session's bank pieces for the pollster scene.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/scene-places.json, src/core2/data/stopgaps/play.json, data/english
