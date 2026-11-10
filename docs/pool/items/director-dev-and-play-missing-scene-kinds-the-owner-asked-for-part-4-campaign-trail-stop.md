---
id: director-dev-and-play-missing-scene-kinds-the-owner-asked-for-part-4-campaign-trail-stop
title: "A statewide candidate's stop in another place changes views there"
area: director
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: opus
effort: high
root: rc7-player-cannot-drive
source: split from director-dev-and-play-missing-scene-kinds-the-owner-asked-for in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A statewide candidate has no scene for a stop in another part of the state, and the campaigns engine records no travel. Add a trail-stop scene where a candidate for a statewide office stops in another place and the views of the people there move, read from records. The rest of the state is counted groups, so the people met there are filled in when met. Seen: a statewide candidate stops in another town in a scene, and the views of the people there move.

**Cause.** Found in code: `knockDoors` (`src/core2/modules/campaigns.ts` line 1526) works the candidate's own town; the rest of the state is counted groups. Design: the owner on Nov 8, "campaigning around the state" (docs/coordination/voice-notes/2026-11-08-story-and-night.md).

**Fix.** Add a `campaign-trail-stop` kind, with a stop recorded in the campaigns engine for a place in the race's electorate, a cast filled in from that place's counts, four replies, and an ending that changes the views of the people met, which the electorate engine reads. Add a dev mode recipe.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the scene's cause is a record an engine already keeps, or a registered stopgap naming the engine that should, and its ending moves something another engine reads. No dice: who joins, who carries and who shows up follow their records and reasons, never a roll. One rule, all 56 places: what an office may do is read from the place's data. This is a game, not a spreadsheet: the owner asked for this scene by name on Nov 8, and it adds no step the player must take.

**Done when.** A second session starts the bench in a drawn place (place and seed written down), plays a candidate for a statewide office, opens dev mode's scene list, finds the trail-stop kind and causes a stop in another place, with a screenshot. It names the stop's campaign record id, the person filled in there with their place record, and the later electorate record that shows views in that place moved.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/core2/modules/campaigns.ts, src/bench/dev-mode.ts
