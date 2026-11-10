---
id: director-opening-as-a-scene-part-3-one-situation-row
title: "The opening is staged from one situation-type row"
area: director
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-opening-as-a-scene-part-1-find-what-is-left, director-opening-as-a-scene-part-2-cutaways-from-records
blocked-on:
lead: director
model: opus
effort: high
root: design-director-on-core2
source: split from director-opening-as-a-scene in the pool redo, Nov 10, 2026
---

**What.** The opening should be one scene. The director stages it from one situation-type row, like every other scene. What is left of its private staging, and the tests that cover only it, is deleted in the same change, and the PR body counts what was removed. The owner's sequence and key people stay as the scene's roles.

**Cause.** Design: docs/design/director-on-core2.md and the owner's ruling that the address is the model for every scene (LAW.md section 3). The list of what is left comes from part 1.

**Fix.** Stage the opening from one situation-type row in `src/director/data/situation-types.json`, keep the owner's sequence (Oct 14) and key people (Oct 15) as the scene's roles, and delete the opening's own stage list and the tests that cover only it.

**Time box.** 6 hours for one Opus session.

**Rules.** Replace, never layer: the opening's own staging and its tests are deleted in the same PR. One engine per mechanic: the director's scene path stages the opening. One rule, all 56 places: no place or office is named in logic.

**Done when.** A second session plays the opening in a drawn place and seed it names (buildBenchWorld, not the builder's choice) and finds it staged by the director's scene path from one situation-type row, with the record id of that row named. A search finds no stage list for the opening and the tests for the old stage list are gone.

**Waits on.** Part 1 (director-opening-as-a-scene-part-1-find-what-is-left) for the list of what is left, and part 2 (director-opening-as-a-scene-part-2-cutaways-from-records) for the cutaways.

**Files.** src/director/opening-story.ts, src/director/data/situation-types.json, src/director/data/opening-story.json, src/bench/opening.ts
