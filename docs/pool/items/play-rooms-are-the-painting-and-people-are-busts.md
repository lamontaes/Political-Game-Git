---
id: play-rooms-are-the-painting-and-people-are-busts
title: "No full-body people in rooms: a room is its painting, who is here is a view of busts, and a talk shows its people as busts on the talk box"
area: play
kind: feature
priority: 1
size: L
status: in-pr
standard: 2
claimed-by:
pr: 8643
after: play-busts-stand-alone-without-the-people-pack
blocked-on:
lead: screens
source: "owner, Nov 10, 2026, about 9:24 p.m. (call 7 of the decisions page), recorded in docs/coordination/OWNER-DECISIONS.md"
model: opus
effort: high
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
---

**What.** The owner ruled on Nov 10, 2026: "Remove all the people. And yes, I think the speaker as a large bust... Maybe people can be on top of the text box and... the picture of their portrait can resize based on how many people there are, and maybe... get a little bigger when they're talking or something. And I think there needs to be ... some kind of screen or mock-up or something to see who's in the room, I guess, when you enter a place if we're not going to have people." Steps 2 and 3 of docs/art/full-body-people-after-early-access.md: the room draws nobody, a who's-here view shows the people present as busts, a click on a bust opens the talk, and the talk box carries its people as a row of busts with the speaker larger. The small round face in the talk box's header goes. Seen: every room the player enters, every talk, and the opening address.

**Cause.** Design: the owner's ruling of Nov 10. Found in code: figures are drawn by `drawPeople` in src/bench/play.mjs (line 218, 13 call sites) from `stagePeople` in src/bench/scene.ts (lines 723 to 879), and a talk starts only from a click on `.figure.talkable` (src/bench/ui/room.mjs, lines 53 to 64), which calls `talkTo(personId)`. The server needs only a living person's id (`/api/talk/open` in src/bench/handler.ts, lines 560 to 581), no spot and no figure.

**Fix.** None until the owner picks from the mock-ups (calls 8 and 9). Then, in one pull request so the player never sees an empty room with no way to talk: build the who's-here view from `presentIds` in src/bench/scene.ts and the talkable test in src/bench/handler.ts (lines 216 to 220), each person a bust from src/bench/ui/bust.mjs that calls the same `talkTo(id)`; build the talk row from the conversation's people; delete `drawPeople`, `#people`, `roomPeople` and their styles. A second pull request deletes the server side named in the record (`stagePeople`, src/bench/mannequin-plates.ts, src/bench/occluders.ts, three art routes, the tests and scripts) and closes the five stopgaps it names.

**Time box.** 12 hours for one Opus session for the first pull request and 6 for the second. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the figures leave in the same change that brings the busts, and each PR body counts what was removed. A view, never a second record: the who's-here view reads who is present from the one scene record and stores nothing. Screens follow the mocks (`screen-to-mock`): the look he picks is built from the shared parts in src/bench/ui. No talk, no click (owner, Nov 1): a person with nothing to say is shown and cannot be clicked. In a scene the player card and the rail are gone and the talk box takes center stage (owner, Nov 7).

**Done when.** A second session, not the builder, starts the bench on main in a drawn place (named, with its seed) at 1440x900. It enters three rooms with people present and sees no full-body figure, sees each person present as a bust in the who's-here view, clicks one and gets a talk whose people show as busts on the talk box with the speaker larger and no small round face in the header. It plays the opening address and sees the President as a bust. `git grep -n "drawPeople\|stagePeople\|roomPeople" src` returns nothing. The page opens a room no slower than main does, timed and stated.

**Waits on.** The owner's answers to calls 8 and 9; play-busts-stand-alone-without-the-people-pack.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/play.css, src/bench/ui/room.mjs, src/bench/ui/bust.mjs (new), src/bench/scene.ts, src/bench/handler.ts, src/bench/montage.ts, src/bench/story.ts, src/bench/whole-figures.ts, src/bench/mannequin-plates.ts, src/bench/occluders.ts, src/bench/people-pack.ts, src/core2/data/stopgaps/play.json, the browser checks that click a figure (person-card, talk-history, four-screens, panels, circumstance-scene, talk-clickable, room-talkable-after-story)

Built (Fable B, 2026-11-11, pull request 8643): the owner answered call 11 with option A, the strip. `peopleHere` in src/bench/scene.ts and src/bench/ui/bust-strip.mjs replace the figures. Pictures in docs/seen/strip-of-busts. The room's request takes 7.9 thousandths of a second against 2.6 on main in Goleta, California (seed 0c066ddb-a485-4cf0-ba75-b14ff37d36d3), where main drew nobody. The server-side files the figures used are left for step 3 of docs/art/full-body-people-after-early-access.md.
