---
id: scene-primary-challenge-told
title: "When a rival from your own party files in your race, the person at home says it is a primary challenge"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: finisher
pr: #6393
blocked-on:
source: "finisher brief, Oct 27: every scene that can fire in a played year speaks with lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The rival-filed scene fires when someone files in a race the player is on the ballot for, and a member of the household brings it home. It never said when that rival runs under the player's own party, which is the owner's primary challenge. A same-party fact now reads both filings' party labels from the elections engine's ballot, and pieces that need it say so and outrank the general ones.

**Rules.** No dice: the scene fires from its cause record and the asker's lines are chosen by their traits through the calibration table, never a roll. One rule, all 56 places: the proof draws its place from all 56 and names the place and seed. Serves `scene-standard`: the reply writes a scene reply back and two opposite speakers say different lines.

**Done when.** In a buildBenchWorld drawn place (seed named) the player files in a partisan race under their own party; a same-party rival's rival-filed record stages the scene; the same-party fact cites the cause record; the statement says the rival is from the player's party; four root replies are four moves; replyInScene writes a scene reply; `primary-challenge.test.ts` and the bank and director tests pass.

**Time box.** 2 hours.

**You will see.** When someone from your own party files in your race, the person at home tells you it's someone from your own side.

**Screenshot.** The composed scene's lines in the PR body, with place and seed.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/primary-challenge.test.ts

**Notes.** Built by the finisher with a helper; review by the director engineer (`Review: director`).
