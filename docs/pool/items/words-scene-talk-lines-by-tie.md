---
id: words-scene-talk-lines-by-tie
title: "Scene-talk lines vary by the speaker's tie to the player (friend, rival, partner, none) as well as by bearing"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Helper B, Oct 27, episode docs/design/scenes/from-life/concession-call-received.md"
lead: words
claimed-at:
---

**What.** The Wildermyth standard (scene-standard rule 4) asks every spoken line to have versions by the speaker's top trait and their tie to the player, but the scene-talk bank selects only by move, step, bearing and the facts a scene carries. No fact in a scene says the speaker is the player's friend, rival or partner, so a loser calling the winner sounds the same whether the two were allies or enemies. Add a tie fact to the scene's facts from the relationship record and write tie-keyed versions for the concession call first, then for the other purposes the owner has heard.

**Rules.** No dice: which version a speaker says follows the tie level and their traits, never a roll. Sliding scales: a tie is a level, so a line asks for the side it is nearer and nothing flips at a threshold. Wire to the world: the tie fact is read from the relationship record between the two people.

**Done when.** src/director/purpose-scenes.test.ts style test in a played world in a place drawn from all 56 with a seed the builder did not choose shows two callers with different ties to the same winner speaking different lines in concession-received, each tie fact citing the relationship record id, and the screen-text check passes.

**Files.** src/director/purpose-scene.ts, src/english/scene-talk-words.ts, data/english/parts/scene-talk.json

**Notes.** Found while building words-scene-concession-received; its lines vary by bearing (the speaker's traits) only.
