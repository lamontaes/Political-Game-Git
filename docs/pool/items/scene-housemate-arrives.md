---
id: scene-housemate-arrives
title: "A new housemate is a scene with a purpose: they ask how the house runs and the player answers four ways"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: finisher
pr: #6369
blocked-on:
source: "finisher brief, Oct 27: every scene that can fire in a played year speaks with lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The arrival type fires when someone joins the player's household (the circumstance producer's new-housemate row), but it had no purpose, so it showed only the narrator and then a general talk. It now plays as an exchange: the newcomer asks how the house runs and where they fit, the player welcomes them, sets terms, asks what they need or says it can't work, and the reply is written back as a scene reply. A relative and a stranger are told apart by the kin and stranger facts.

**Rules.** No dice: the scene fires from its cause record and the asker's lines are chosen by their traits through the calibration table, never a roll. One rule, all 56 places: the proof draws its place from all 56 and names the place and seed. Serves `scene-standard`: the reply writes a scene reply back and two opposite speakers say different lines.

**Done when.** In a buildBenchWorld drawn place (seed named) a new-housemate moment composes with a purpose, the four root replies are four moves, the same trait profile says the same lines and opposite profiles say different ones, and replyInScene writes a scene reply naming the moment; `housemate-scene.test.ts`, `english-parts-banks` and `director` tests pass.

**Time box.** 2 hours.

**You will see.** When someone moves into your household, they ask how the house runs, and you welcome them, set terms, ask what they need, or say it can't work.

**Screenshot.** The composed scene's lines in the PR body, with place and seed.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, src/director/housemate-scene.test.ts

**Notes.** Built by the finisher with a helper; review by the director engineer (`Review: director`).
