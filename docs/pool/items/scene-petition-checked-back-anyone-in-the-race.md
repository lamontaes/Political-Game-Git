---
id: scene-petition-checked-back-anyone-in-the-race
title: "A player whose petition fell short can back anyone in the race they would back, not only the first"
area: director
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: scene-clerk-petition-word
blocked-on:
lead: director
model: sonnet
effort: medium
root: none
source: "Account lead, Nov 15, 2026, on #9441: the reply menu offered a cap with no reason in the game"
checked:
---

**What.** After the clerk says a petition fell short, the player's reply menu offers a "Then I'll back <name>" reply for the first candidate only. A race can hold more. Seen: the clerk's scene after a short petition in a race with three or more candidates the player would back, with one reply for each.

**Cause.** Found in code: `endorsementChoices` in `src/core2/modules/campaigns.ts` returns every standing candidate the player would back by the one endorsement rule, in order of how much; `src/director/purpose-scene.ts` (`BACKING_KEYS`, `BACKING_MOVES`) keeps only the first because `src/director/data/purpose-arcs.json` gives the `petition-checked` arc one backing reply move (`promise`) and the tree builder in `src/director/scene-talk.ts` makes one reply per reply move. The single reply is the shape of the reply menu, not a rule of the game.

**Fix.** Let one reply move repeat once per fact it is bound to (a `repeatsFor` list on the arc's reply, read in the tree builder of `src/director/scene-talk.ts`), so one bank line "Then I'll back {backable}." is offered once per candidate in `endorsementChoices`, each reply carrying that candidate's filing id; `purpose-scene.ts` writes the endorsement for the chosen one only. Delete `BACKING_KEYS` and `BACKING_MOVES`..

**Time box.** 3 hours for one sonnet session.

**Rules.** One scene engine; no dice; nothing written for the player without their press.

**Done when.** A second session, in a place and seed it draws, stages a short petition in a race with three or more candidates the player would back, sees one backing reply for each, and finds the one they pick under their own name.

**Waits on.** #9441.

**Files.** src/director/scene-talk.ts, src/director/purpose-scene.ts, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/core2/modules/campaigns.ts

**Notes.** Raised by the Account lead on #9441.
