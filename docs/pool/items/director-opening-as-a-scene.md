---
id: director-opening-as-a-scene
title: "The opening address plays as one director scene cast from records, and the opening's own stage list and picture table are deleted"
area: director
kind: feature
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: CTO opening root-cause report, Oct 27
---

**What.** The opening runs on its own path: a fixed stage list in src/director/data/opening-story.json, a picture table keyed by topic in src/bench/data/opening-pictures.json, and its own cast rule (castOf) in src/bench/opening.ts. Its cutaways are stock rooms with nobody in them, chosen by the sentence's topic rather than from the town's records. In Iowa City, Iowa, seed 28c0b8150290, all four cutaways (unemployment office, factory floor, grocery store, main street) stood empty. The owner called the address the model for every scene, where the director reads the records and fires one (LAW.md section 3, OD:233). Root cause and evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Replace, never layer: the stage list, opening-pictures.json, castOf, cutawayFor, placeOf and their tests are deleted in the same PR, and the body counts what was removed. Wire to the world: each cutaway is the town's own business for the fact (orgPlace) with the people who work there (presentIds). One rule, all 56 places: no place, picture or office named in logic. The owner's sequence (Oct 14) and key people (Oct 15) stay as the scene's roles.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, both named in the PR, the opening is staged by the director's scene path from one situation-type row; every cutaway's setting names an organization record id in that town and at least one cast person whose job record is at it; the home frames use the evening; and grep finds no opening-pictures.json or castOf on the branch.

**Time box.** 8 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/director/data/situation-types.json, src/director/opening-sequence.ts, src/director/opening-story.ts, src/bench/opening.ts, src/bench/data/opening-pictures.json, src/bench/scene.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: director.
