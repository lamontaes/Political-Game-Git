---
id: scene-hallway-word
title: "The hallway after a meeting is a scene with a purpose: a colleague, a reporter or a lobbyist each speak for their own reason"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: finisher
pr: #6367
blocked-on:
source: "finisher brief, Oct 27: every scene that can fire in a played year speaks with lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The hallway type fires after the player's body sits (a colleague or a reporter) and after a lobbyist's case (the lobbyist), but it had no purpose, so it showed only the narrator and then a general talk. It now plays as an exchange: the one who catches the player says why they came, the player has four replies in four stances, and the reply is written back as a scene reply. Each cause speaks for its own reason through its own key.

**Rules.** No dice: the scene fires from its cause record and the asker's lines are chosen by their traits through the calibration table, never a roll. One rule, all 56 places: the proof draws its place from all 56 and names the place and seed. Serves `scene-standard`: the reply writes a scene reply back and two opposite speakers say different lines.

**Done when.** In a buildBenchWorld drawn place (seed named) a hallway moment composes with a purpose, the four root replies are four moves, the same trait profile says the same lines and opposite profiles say different ones, and replyInScene writes a scene reply naming the cause record id; `hallway-scene.test.ts`, `english-parts-banks`, `scene-talk` and `director` tests pass.

**Time box.** 2 hours.

**You will see.** After a meeting, a colleague, a reporter or a lobbyist catches you in the hallway and asks something you answer four ways.

**Screenshot.** The composed scene's lines in the PR body, with place and seed.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/purpose-scene.ts, src/director/scheduling.ts, data/english/parts/scene-talk.json, src/director/hallway-scene.test.ts

**Notes.** Built by the finisher with a helper; review by the director engineer (`Review: director`).
