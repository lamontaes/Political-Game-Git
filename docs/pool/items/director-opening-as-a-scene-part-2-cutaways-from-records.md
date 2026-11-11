---
id: director-opening-as-a-scene-part-2-cutaways-from-records
title: "Cutaways reconciled with the montage: recommend drop"
area: director
kind: feature
priority: 1
size: M
status: dropped
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

**What.** Nothing remains to build as specified. The topic table (`src/bench/data/opening-pictures.json`), the stock-room choice, and the opening's `castOf` are deleted (trim dcfc8aa74c, after #6284); the owner's Oct 29 02:35 ruling replaced record-cutaways with the montage (fixed tagged pictures, cast from records; Nov 4: no people in the state beat). Part 1 checked the cutaways in two drawn places (Hannah, North Dakota, seed `55ca2f…03316`; Brevard, North Carolina, seed `af1f9d…2879a`): no cutaway names an organization record id — settings are the depot platform, state capitol, Oval Office, colonnade, and home, cast from townspeople, household, and key people named by office (see part 1's Notes for the full list). Building this item's Fix now would undo that ratified design.

**Cause.** Found in code: part 1's list (`director-opening-as-a-scene-part-1-find-what-is-left`, Notes): premise files deleted, settings ratified as montage framing (`src/bench/montage.ts` `addressMontage`, `src/bench/data/opening-montage.json`, beats in `src/bench/story.ts`). Root-cause report (history): `docs/reports/opening-root-cause-2026-10-27.md` (live path until PR #8248 merges, then under `docs/archive/2026-10-23/reports/`).

**Fix.** Recommend drop (CTO only; builders cannot mark dropped): there is no topic table, stock-room choice, or `castOf` left to delete or replace. If the owner still wants organization-record cutaways, that is a new item against the montage, not this one.

**Time box.** 6 hours for one Opus session.

**Rules.** Do not rebuild what the montage replaced: no new cutaway path beside `montage.ts`, no second cast beside the scene's. One rule, all 56 places: no place, picture or office is named in logic.

**Done when.** A second session reads part 1's Notes list and confirms every file this item named is gone (`opening-pictures.json`, `castOf`, `cutawayFor`, `placeOf`/`capitol`), then opens the opening in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, names the place and seed, and sees the cutaways play as montage beats cast from records; the CTO then drops this item.

**Waits on.** Part 1 (director-opening-as-a-scene-part-1-find-what-is-left) for the list of what is left.

**Files.** src/bench/montage.ts, src/bench/data/opening-montage.json, src/bench/story.ts

Nov 11 (CTO): dropped, as part 1 (#8361, merged) recommends. The topic table, the stock-room choice and the opening's castOf are already deleted, and the owner's Oct 29 montage ruling replaced record cutaways, so building this Fix would undo a ratified design.
