---
id: play-campaign-acts-as-scenes
title: "The seven campaign buttons on the trail card become scenes at places"
area: play
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** SG-PLAY-campaign-acts-buttons: Volunteers, Donations, Endorsements, Ad, Poll, Mail and Put in your own money are still buttons on the campaign trail card. Owner (OWNER-DECISIONS, Door-knocking and every campaign act are scenes): campaign acts are scenes you go to.

**Rules.** Scene standard: a scene writes something back. One engine: each act keeps its existing handler and record; only how it starts changes. Replace, never layer: the button and the stopgap are deleted with each scene. Review: words.

**Done when.** In a played world in a drawn place (named with seed), each of the seven starts as a scene with people on screen: an evening of donor calls, a volunteer shift at the office, an endorsement meeting, an ad shoot, the pollster's briefing, the mail piece, putting in your own money; each writes the same record as its button did; the trail card holds no button for them; SG-PLAY-campaign-acts-buttons is resolved.

**Files.** src/bench/play.mjs,src/director,data/english

**Notes.** TODO
