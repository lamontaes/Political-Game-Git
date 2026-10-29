---
id: words-address-national-only
title: "The President's address says nothing about the player's state or town"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: finisher
pr: #6428
blocked-on:
source: "finisher brief, Oct 27: every scene that can fire in a played year speaks with lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** The owner ruled on Oct 27 that the President's address is national only: nothing about the player's state. The address put a state law to the governors when the player's state answered it the other way, thanked the player's governor by name, and named the player's state when the President's campaign had visited it. Those three reads are deleted with their bank pieces, so the address speaks to the country and Congress alone.

**Rules.** No dice: the scene fires from its cause record and the asker's lines are chosen by their traits through the calibration table, never a roll. One rule, all 56 places: the proof draws its place from all 56 and names the place and seed. Serves `scene-standard`: the reply writes a scene reply back and two opposite speakers say different lines.

**Done when.** No sentence of the opening address in a buildBenchWorld drawn place is at the governors or towns level or cites a state law; `opening-story.ts` reads no player state or town for the address; the 32 bank pieces for those blocks are deleted; `opening-story`, `opening-asks`, `opening-address` and `english-parts-banks` tests pass.

**Time box.** 2 hours.

**You will see.** The President's address no longer mentions your state, your governor or your town.

**Screenshot.** The composed scene's lines in the PR body, with place and seed.

**Files.** src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/opening-speech.json, src/director/opening-address.test.ts, src/director/opening-asks.test.ts, src/director/opening-story.test.ts

**Notes.** Built by the finisher with a helper; review by the director engineer (`Review: director`).
