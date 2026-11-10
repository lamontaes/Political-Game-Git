---
id: director-opening-as-a-scene
title: "The opening address plays as one director scene cast from records, and the opening's own stage list and picture table are deleted"
area: director
kind: feature
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on: director-opening-as-a-scene-part-1-find-what-is-left, director-opening-as-a-scene-part-2-cutaways-from-records, director-opening-as-a-scene-part-3-one-situation-row
model: opus
effort: high
root: design-director-on-core2
lead: director
source: CTO opening root-cause report, Oct 27
---

**What.** Part 1 lists what is left, and parts 2 and 3 are written from its list. The opening runs on its own path in `src/director/opening-story.ts` (1,228 lines, its own staging with a cutaway comment near line 870), and the owner called the address the model for every scene, where the director reads the records and fires one (LAW.md section 3, OD:233). In Iowa City, Iowa, seed 28c0b8150290, all four cutaways (unemployment office, factory floor, grocery store, main street) stood empty. Most of what this item first asked to delete is already gone (the picture table `src/bench/data/opening-pictures.json` and `castOf` no longer exist, and play-opening-pictures-from-records is done), so what remains of the opening's own path has to be listed before anything is built. Root cause and evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Cause.** Needs cause. Looked at: `src/director/opening-story.ts` (still its own staging), `src/director/data/opening-story.json` (only number rounding and speech titles), `src/bench/opening.ts`; no stage list or picture table is left. Unknown: whether every cutaway names an organization record and whether the opening is one situation-type row.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session for the closing check after the three parts; each part carries its own time box.

**Rules.** Replace, never layer: the opening's own staging is deleted in the same change that moves it to the director's path, and the body counts what was removed. Wire to the world: each cutaway is the town's own business for the fact with the people who work there. One rule, all 56 places: no place, picture or office named in logic.

**Done when.** A second session plays the opening in a drawn place and seed it names (buildBenchWorld, not the builder's choice) and finds the opening staged by the director's scene path from one situation-type row, every cutaway's setting naming an organization record id in that town with at least one cast person whose job record is at it, and the home frames using the evening. A search finds no stage list for the opening on the branch.

**Waits on.** Its three parts: director-opening-as-a-scene-part-1-find-what-is-left, director-opening-as-a-scene-part-2-cutaways-from-records, director-opening-as-a-scene-part-3-one-situation-row.

**Files.** src/director/opening-story.ts, src/director/data/opening-story.json, src/director/data/situation-types.json, src/bench/opening.ts, src/bench/scene.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: director.
