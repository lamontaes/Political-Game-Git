---
id: release-press-counted-town-query
title: "Release builds retain the counted-resident import needed by town stance"
area: release
kind: bug
priority: 1
size: S
status: claimed
claimed-by: fix/main-red-2026-10-26-press-counted
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T14:57:25.632Z
---

**What.** Release run 40340740222 fails while building its exact candidate from main merge 73a69bbb899dab6e208ae114365200fdac6db541. Concurrent press changes left townStand calling countedResidents after main changed the import to countedResidentsOf. Restore the full-record query import for town stance while preserving the projected query used for audience counts, so the client builds and both population tiers keep contributing.

**Rules.** Red main comes first: repair the actual compile failure without skipping or loosening build checks. One model, two tiers: retain full and weighted counted adults and the exact individual lean after fill-in. Replace, never layer: reuse both existing queries without adding another population reader.

**Done when.** Reproduce press.ts TS2552 on clean main in the local typecheck. On the repaired tree, the build including typecheck and all scoped changed-file checks pass, with only explicitly reproduced main pool failures excepted. The existing press-town-stand test passes in a fresh drawn generated town with its seed named, verifying weighted counted influence and exact filled-person lean. Preserve the scoped audience query, publish a complete Done-when evidence table, and leave the ready repair PR for another merger.

**Files.** src/core2/modules/press.ts, src/core2/press-town-stand.test.ts, docs/release/changes/release-press-counted-town-query.md

**Notes.** Bounded repair for release-main-red. Merger 2 reproduced the clean-main missing-name error locally: exit2,606.86s,4037264KiB peak child RSS. The shared tracker remains separately claimed; this bounded item alone is the completion target.
