---
id: words-no-place-presence-in-finisher-lines
title: "The finisher's scene lines stop saying where the player is or who is with them"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: finisher
pr: #6380
blocked-on:
source: "finisher brief, Oct 27: every scene that can fire in a played year speaks with lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The owner, at the 4 PM Eastern sitting, said lines that tell the player where they are or who is with them are banned from the English engine. The finisher's pieces shipped today for the hallway and the new housemate had ten narration and opening lines of that kind. Seven are rewritten to say who the person is and why they came, and three are cut.

**Rules.** No dice: the scene fires from its cause record and the asker's lines are chosen by their traits through the calibration table, never a roll. One rule, all 56 places: the proof draws its place from all 56 and names the place and seed. Serves `scene-standard`: the reply writes a scene reply back and two opposite speakers say different lines.

**Done when.** Every piece authored by the finisher in `data/english/parts/scene-talk.json` is scanned for where-you-are and who-is-with-you phrases (with you, in the room, under one roof, down the hall, here we are); none remain in narration or openings; `english-parts-banks` passes; the hallway and housemate scenes still compose in their played-world tests.

**Time box.** 2 hours.

**You will see.** The hallway and a new housemate open on who the person is and why they came, never on where you are or who is with you.

**Screenshot.** The composed scene's lines in the PR body, with place and seed.

**Files.** data/english/parts/scene-talk.json

**Notes.** Built by the finisher with a helper; review by the director engineer (`Review: director`).
