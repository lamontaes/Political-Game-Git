---
id: words-family-loss-scene-the-part-they-played
title: "The talk at home after a lost race comes from a relative who put work or money into it, and what you say decides whether the household backs the next run"
area: words
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After a race is lost, the household talk is staged for every relative today, with generic comfort lines such as 'Come to bed. It'll still be true in the morning.', and it writes nothing the next election reads. This item casts the scene only for a household member the records show put something in (they are counted among the campaign's volunteers, or the candidate gave their own money), opens on what they put in and how close the count was, and writes the reply where the next candidacy decision reads it. Episode: the night after a first loss, from local candidates who lost by a few dozen votes and ran again (Jefferson City 2013, Raincross 2019 and 2024).

**Rules.** Serves scene-standard rule 1 (no consequence, no scene) and rule 2 (cast from the world), and wire-to-the-world: the household's backing is read by the candidacy engine when the person weighs the next contest. No dice: the relative's answer follows their traits and the tie, never a chance.

**Done when.** In a drawn place after a lost race where a household member is on the campaign's volunteer list or the candidate gave their own money, the family-loss scene is staged for that member, opens on what they put in, and has four replies that are four stances; with neither record no scene is staged; the reply to running again writes a record that candidacyReasons reads as a pull for the next contest, shown by a test in buildBenchWorld naming the place, the seed and the record ids; the Oct 15 comfort lines the scene replaces are deleted.

**Files.** src/director/family-stake.ts, src/director/purpose-scene.ts, src/core2/modules/candidacy.ts, data/english/parts/scene-talk.json

**Notes.** Lead: words. Scene builder A, episode 2, stacked on #6237 (episode 1). Packet: docs/design/scenes/from-life/household-after-the-loss.md.
