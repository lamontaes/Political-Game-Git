---
id: director-moments-for-a-new-adult
title: "An 18-year-old played for eight months gets director moments"
area: director
kind: bug
priority: 3
status: claimed
claimed-by: claude/moments-new-adult
pr:
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at: 2026-10-16T10:59:17.526Z
---

**What.** A play-test of an 18-year-old from October 12, 2026 got no director moments in eight months in a two-level town, and none in five months in a normal one. So no big moment ever stops a skip and the staged scenes never play. Find out whether the director measures only people in households, jobs or offices, or something on the merged stack is not reaching a new adult at home. Recheck on main first, since several producers have landed since.

**Rules.** Wire to the world: a moment comes from a record another engine wrote, by id. No dice: the director picks by what the records say. No hand-written player text. Speed: no daily whole-world scan.

**Done when.** In the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), the bench player of a new adult skips eight months and meets at least one director moment, with the record id that produced it named, and a test in src/director checks that a skip stops on it. The owner plays it: skips and is stopped by a scene.

**Files.** src/director/, src/bench/player.ts

**Notes.** Found while triaging play-needs-play-147.
