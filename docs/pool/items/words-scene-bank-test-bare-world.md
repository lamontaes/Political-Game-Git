---
id: words-scene-bank-test-bare-world
title: "The mined scene-bank test is red on main: its bare 600-person world binds no scene in six weeks"
area: words
kind: bug
priority: 2
size: S
lead: words
status: in-pr
claimed-by: words/scene-bank-played-world
pr: #6740
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T04:40:48.738Z
---

**What.** src/english/mined/scene-bank.test.ts fails on main (886c21ab72 and back past 9bfa706c9c) in Worthington, Kentucky, seed words-scenes: 'narrates staged scenes from mined sentences, each traced to records' counts 0 lines. Its world is buildPopulation with 600 people and no modules but the director; by February 15, 2021 the director holds 26 scheduled moments for 12 watched people and none binds anyone, so composeScene never runs. CI runs only changed test files, so the red went unseen.

**Rules.** An effect is a read, not a record: a unit test that builds its own small world proves nothing about play, so the scene bank must be proven in a played world (buildBenchWorld, every module, a drawn place). One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** scene-bank.test.ts passes on main in a played world built with buildBenchWorld for a drawn place and a seed the builder did not choose, with at least one staged scene whose narration lines are mined sentences that cite record ids, and the test names the place, seed and record ids it read.

**Files.** src/english/mined/scene-bank.test.ts

**Notes.** TODO
