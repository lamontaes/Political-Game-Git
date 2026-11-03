---
id: play-campaign-acts-as-scenes
title: "The seven campaign buttons on the trail card become scenes at places"
area: play
kind: feature
priority: 2
size: L
status: open
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-02T00:34:57.259Z
---

**What.** SG-PLAY-campaign-acts-buttons: Volunteers, Donations, Endorsements, Ad, Poll, Mail and Put in your own money are still buttons on the campaign trail card. Owner (OWNER-DECISIONS, Door-knocking and every campaign act are scenes): campaign acts are scenes you go to. The owner's words: "Door-knocking and every campaign act are scenes... Scenes are the game. They're the narrative." The doors, event, forum, interview, calls, donor meeting, speech and debate already start their scenes from the campaign trail card in Travel (play-first-13-campaign-screen-to-mock-b); these seven are the ones that do not yet.

**Rules.** Scene standard: a scene writes something back. One engine: each act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button and the stopgap are deleted with each scene. Review: words.

**Done when.** In a played world in a drawn place (named with seed), each of the seven starts as a scene with people on screen: an evening of donor calls, a volunteer shift at the office, an endorsement meeting, an ad shoot, the pollster's briefing, the mail piece, putting in your own money; each writes the same record as its button did; the trail card holds no button for them; SG-PLAY-campaign-acts-buttons is resolved.

**Files.** src/bench/play.mjs,src/director,data/english

**Notes.** Handoff Nov 2 (lane, Claude Sonnet 5.5). Done, one PR each, stacked in order #7067 then #7109 (donor calls) then #7111 (volunteers) then #7112 (endorsements) then #7132 (ad); Donations twin deleted. Left: Poll, Mail, Put in your own money. Poll is built on branch play-first/play-campaign-poll-scene at 82eb4dac0b (campaign.ts poll case with line and scene, pollsterBriefingPlace row, two poll-none bank pieces, src/bench/poll-briefing.browser.mjs) but its check fails: after the player puts money in and the card is reopened, the second Poll click gets no /api/campaign/act response on ocr-1 and ocr-7 (the Ad check passed with the same steps; start by printing the Poll button's disabled state and the card text before the second click). Pattern for each act: answers carry name and line, scene from askScene with a place row in scene-places.json, playAsks in play.mjs, bank pieces to Words, Touches: line 1, update SG-PLAY-campaign-acts-buttons (three remain: Poll, Mail, Put in your own money). Branch to continue from: the top of the stack, then branch the next act off it.
