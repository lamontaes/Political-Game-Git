---
id: play-opening-pictures-from-records
title: "The opening's cutaways and the President's stage come from the world's records, and the President speaks from a podium"
area: play
kind: feature
priority: 1
size: M
status: done
claimed-by: play-first/play-opening-pictures-from-records
pr: #6284
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T10:58:23.362Z
---

**What.** The opening cut to fixed stock pictures chosen by topic (an unemployment office, a factory floor, a grocery store) with nobody in them, and showed the President as a portrait. The cutaways now go to the town's own employer of a kind the figure is about, pictured by that organization's own record, with the people who work there; the President speaks from the podium of the picture, in the lectern pose, with the others beside him. CTO order of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md); part of what director-opening-as-a-scene will absorb.

**Rules.** Serves LAW.md section 3 (OD:108, OD:233) and section 2. Wire to the world: a cutaway's setting names an organization record in the town and its cast are people with jobs there. One rule, all 56 places: no place named in logic. Replace, never layer: the fact-to-picture table is deleted.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR: every cutaway's place is orgPlace of an organization record in the player's town or county and its cast hold jobs there (src/bench/opening-cutaway-cast.test.ts); the President's person in the first frame stands on the picture's podium spot (src/bench/opening-pictures.test.ts); screenshots at 1440x900 of the first frame and a cutaway. Time box: 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/bench/opening.ts, src/bench/scene.ts, src/bench/whole-figures.ts, src/bench/data/opening-pictures.json

**Notes.** TODO
