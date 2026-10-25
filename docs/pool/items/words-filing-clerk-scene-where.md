---
id: words-filing-clerk-scene-where
title: "The clerk's filing scene never plays: its narration needs the office where you file, and nothing supplies it"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The word pack (#4626) added a filing-clerk scene that a filing stages ahead of the household's family-filing scene. All five of its narration lines in data/english/parts/scene-talk.json need a where slot ("The {where} is nearly empty when you come in to file for {office}."), and src/director/purpose-scene.ts supplies no where fact, so composing it returns 'no narration for filing-clerk can be worded from the records given'. In played worlds (Deer Park, Washington, seed 393dad669a24a488:1; Kodiak Station, Alaska, seed 36a24250265aabef:3) every filing's clerk scene is skipped; purposeScene now falls through to the household's scene, so play shows that one instead.

**Rules.** Wire to the world: the where is the filing office the records name (filingClerkFor in src/core2/modules/filing-clerk.ts: the clerk, registrar or board of elections that takes this filing), spoken from its record, never typed. No hand-written player text: the lines are the bank's. Once the clerk scene can be worded, the play screen plays both scenes a filing stages, the clerk's at the counter and the household's at home, in that order.

**Done when.** In a played world built with buildBenchWorld in a place drawn from all 56 (seed named), a resident's filing composes the filing-clerk scene in the lines that play, with a where fact citing the filing office's record and the clerk cast from filingClerkFor, and the story screen shows it before the household's scene; shown by src/director/purpose-scenes.test.ts or its own test.

**Files.** src/director/purpose-scene.ts, src/bench/story.ts, src/core2/modules/filing-clerk.ts, src/director/purpose-scenes.test.ts

**Notes.** TODO
