---
id: play-campaign-acts-as-scenes
title: "The seven campaign buttons on the trail card become scenes at places"
area: play
kind: feature
priority: 2
size: L
status: open
standard: 2
pr:
blocked-on: play-campaign-acts-as-scenes-part-1-poll-as-a-scene, play-campaign-acts-as-scenes-part-2-mail-as-a-scene, play-campaign-acts-as-scenes-part-3-own-money-as-a-scene
source: added with npm run pool -- add
claimed-at: 2026-11-02T00:34:57.259Z
after:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
---

**What.** Three campaign acts are still buttons on the campaign trail card, not scenes: Poll, Mail and Put in your own money (the registered stopgap SG-PLAY-campaign-acts-buttons). Volunteers, donor calls, endorsements and the ad were turned into scenes with people on screen, each writing the same record as its button did. The owner ruled that every campaign act is a scene you go to ("Scenes are the game. They're the narrative"), so these three need the same treatment. Each keeps its existing handler and record; only how it starts changes. The work is split into three parts, one per act, and the stopgap closes with the last of them.

**Cause.** Design: owner ruling "Door-knocking and every campaign act are scenes" in docs/coordination/OWNER-DECISIONS.md and the open stopgap SG-PLAY-campaign-acts-buttons in src/core2/data/stopgaps/play.json (line 303); in the act handler in src/bench/campaign.ts the cases for `poll`, `mail` and `contribute` (lines 314 to 390) return no `scene`, while volunteers and the ad return `scene: askScene(core, personId, scenePlaces...)` (lines 312 and 372).

**Fix.** Done through the three parts: each act starts as a scene with people on screen, using the existing pattern (answers carry name and line, `askScene` with a place row in src/bench/data/scene-places.json, `playAsks` in src/bench/play.mjs, bank pieces from Words), deletes its button and updates the stopgap. This parent closes when the last part resolves the stopgap.

**Time box.** 2 hours for one Sonnet session, only to confirm the parts landed and close this item; the build time is in the parts.

**Rules.** Scene standard: a scene writes something back. One engine: each act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button and the stopgap row are deleted with each scene. Review: words. No hand-written player text: the scenes' lines come from bank pieces.

**Done when.** A second session, in a played world in a drawn place (named with its seed), finds each of the seven campaign acts (donor calls, volunteer shift, endorsement meeting, ad shoot, the pollster's briefing, the mail piece, putting in your own money) starting as a scene with people on screen, each writing the same record as its button did, the trail card holding no button for them, and SG-PLAY-campaign-acts-buttons marked resolved in src/core2/data/stopgaps/play.json.

**Waits on.** The three parts, in any order (play-campaign-acts-as-scenes-part-1-poll-as-a-scene, part-2-mail-as-a-scene, part-3-own-money-as-a-scene), and the Words session's bank pieces for the three scenes.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/data/scene-places.json, src/core2/data/stopgaps/play.json, data/english

**Notes.** Handoff Nov 2 (lane, Claude Sonnet 5.5). Done, one PR each, stacked in order #7067 then #7109 (donor calls) then #7111 (volunteers) then #7112 (endorsements) then #7132 (ad); Donations twin deleted. Left: Poll, Mail, Put in your own money. Poll is built on branch play-first/play-campaign-poll-scene at 82eb4dac0b (campaign.ts poll case with line and scene, pollsterBriefingPlace row, two poll-none bank pieces, src/bench/poll-briefing.browser.mjs) but its check fails: after the player puts money in and the card is reopened, the second Poll click gets no /api/campaign/act response on ocr-1 and ocr-7 (the Ad check passed with the same steps; start by printing the Poll button's disabled state and the card text before the second click). Pattern for each act: answers carry name and line, scene from askScene with a place row in scene-places.json, playAsks in play.mjs, bank pieces to Words, Touches: line 1, update SG-PLAY-campaign-acts-buttons (three remain: Poll, Mail, Put in your own money). Branch to continue from: the top of the stack, then branch the next act off it.
