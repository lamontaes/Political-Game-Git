---
id: golden-door-ask
title: "A door on the player's canvass is a scene: the player asks the resident for their vote"
area: director
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: golden-path playthrough, Oct 28
lead: play-first
milestone: play-first
---

**What.** Knocking on doors fires the director's door rows (#6406), but they played the general first-meeting and visit talks: the resident at the door talked about the President's speech or a news story, never the race, with no narration. The owner ruled door knocking a short scene at one or two doors (Oct 27) with porch scenes (Oct 8). This makes the door the player's own ask for the resident's vote, answered from where the knock left the resident.

**Rules.** Wire to the world: the resident's answer reads the campaign engine's warmth after the knock (its causes table), and the reply is kept as a scene reply and time together on the tie. No dice: the answer follows the resident's standing, never a roll. No hand-written player text: the door's narration and request are bank pieces on the support ask's bank. One engine per mechanic (owner, Oct 27): the one player-asks composer takes each purpose's moves as a data row; no second composer.

**Done when.** The test src/director/circumstance.test.ts, in a buildBenchWorld drawn place with the seed it prints, plays a filed candidate's year in which every door row composes a door scene with narration, the player's request and the resident's answer, and keeps a reply; the vote-sought tests still pass; and a bench screenshot from a drawn place shows a door scene.

**Time box.** 4 hours.

**You will see.** You knock, someone opens the door, you ask for their vote, and they tell you where they stand.

**Screenshot.** A door scene at 1440 by 900 from a drawn place, in the PR body.

**Files.** src/director/ask-talk.ts, src/director/purpose-scene.ts, src/director/data/situation-types.json, src/director/data/circumstances.json, data/english/parts/scene-talk.json, scripts/scene-web/domains.json

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `golden/door-ask` is kept; claiming this item takes it over.
