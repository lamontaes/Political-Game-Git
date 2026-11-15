---
id: director-scene-several-speakers-at-one-table
title: "A scene lets several people at one table each speak in turn, the governor's briefing room first"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: governor's briefing room builder, Nov 15; Account lead ruling: cast only the people who speak
lead: words-engine
claimed-at:
---

**What.** A scene with a purpose gives speaking turns to the player and one other person: the arc (`src/director/data/purpose-arcs.json`) names `asker` and `asked`, and the scene composer in `src/director/scene-talk.ts` words each turn for those two. A meeting, a briefing or a table of several people has more than two who would speak. Let a situation type seat several non-player speakers, each taking turns in the arc in order, each worded from their own role and facts, so no seated person stands silent in the room. The governor's disaster briefing is the first scene that needs it: the map of heads in `src/core2/data/executive/emergency.json` names several. Seen: a scene at a table where each seated person says their own line before the player answers.

**Cause.** Found in code: `src/director/scene-talk.ts` composes turns for the arc's asker and asked roles only (`purposeScene` in `src/director/purpose-scene.ts` casts the rest as the room, silent); the briefing room PR (#9439) removed its `heads` role for that reason. The meetings and floor thread keeps one speaker per turn for floor debate (Account lead, Nov 15), so nobody owns it.

**Fix.** Extend the arc in `src/director/data/purpose-arcs.json` and the composer in `src/director/scene-talk.ts` with an optional list of further speaking roles, one turn each in the order the arc gives, using the existing piece pick and the never-said-twice rule. The player sees each seated person speak in the scene before the replies. No second scene engine.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes and say so. Seen: the governor's briefing with two heads each speaking.

**Rules.** No dice. Wire to the world: the speakers are the people the records seat. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, on main in a drawn place and a seed the builder did not choose, plays a scene with three or more speakers and sees each speak in order by record id, and a test in `src/director/scene-talk.test.ts` fails when a seated speaker has no turn.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, src/director/scene-talk.test.ts

**Notes.** Nov 15, filed by the governor's briefing room builder at the Account lead's direction; the briefing room is not built on it. Words lead writes any lines for added speakers. Feeds: director-emergency-briefing-other-heads.
