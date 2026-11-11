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
after: director-opening-as-a-scene-part-1-find-what-is-left
blocked-on:
lead: director
model: opus
effort: high
root: design-director-on-core2
source: split from director-opening-as-a-scene in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The opening should be one scene. The director stages it from one situation-type row, like every other scene. The owner's sequence (Oct 14) and key people (Oct 15) stay as the scene's roles. (Part 1 found the deletions this item used to carry already landed: the stage list, `opening-sequence.ts`, the picture table, `castOf`, the news functions, and the opening box are gone in trim dcfc8aa74c, and no test covers only them — so this part deletes nothing.)

**Cause.** Design: docs/design/director-on-core2.md and the owner's ruling that the address is the model for every scene (LAW.md section 3). The list of what is left comes from part 1 (`director-opening-as-a-scene-part-1-find-what-is-left`, Notes): no situation-type row stages the opening today — the evening scene comes from `storyScene` beats plus `openingFrames` (`src/bench/opening.ts`, `src/bench/handler.ts` `sceneNow`), composed by `composeOpeningStory`/`recordOpeningStory`.

**Fix.** Add one situation-type row in `src/director/data/situation-types.json` staging the opening, with the owner's sequence as its stages and the key people as its roles, cast by the director; keep `composeOpeningStory`/`recordOpeningStory` (the yearly address in `src/director/yearly-address.ts` reuses them), `openingFrames`, the montage beats, and every current opening test green (`opening-story.test.ts`, `opening-address*.test.ts`, `opening-news.test.ts`, `montage.test.ts`).

**Time box.** 6 hours for one Opus session.

**Rules.** Replace, never layer: the row stages the opening through the director's scene path, and no new staging files beside it. One engine per mechanic: one situation row for the opening's staging, one address composer for its words. One rule, all 56 places: no place or office is named in logic.

**Done when.** A second session plays the opening in a drawn place and seed it names (buildBenchWorld, not the builder's choice) and finds it staged by the director's scene path from one situation-type row, with the record id of that row named. A search finds no staging files for the opening beside that row, and the current opening tests still pass.

**Waits on.** Part 1 (director-opening-as-a-scene-part-1-find-what-is-left) for the list of what is left. (Part 2's cutaways are settled: the montage plays them from records, and part 2 recommends drop.)

**Files.** src/director/data/situation-types.json, src/director/opening-story.ts, src/bench/opening.ts, src/bench/story.ts
