---
id: core-old-imports-tooling
title: "The opening tooling scripts read the core's legislation, rule-pack and state data, not the old engine's"
area: core
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Three tooling scripts under `src/core2/tooling/` import the old engine: `generated-world.ts` (history index and world), `build-place-lookup-data.ts` (legislation scenarios, demo jurisdiction context, legislature rule packs, seats of government, state reference) and `build-opening-schools.ts` (local institutions data). Point each at the core's copy of the data or the file it generates from, and delete what nothing else reads. These run at build time, not in play.

**Rules.** Replace, never layer: the old import is deleted when its replacement lands. Build only what the golden path needs. Same town by record id for a drawn place before and after. One rule, all 56 places: no place is named in code.

**Done when.** The grep for imports of the old engine under `src/core2/tooling` prints nothing, the typecheck passes, and each script writes the same output file it wrote before, checked by hash in the PR body, on a drawn place and a seed the builder did not choose, with a test in src/core2 that names the file.

**Files.** src/core2/tooling/generated-world.ts, src/core2/tooling/build-place-lookup-data.ts, src/core2/tooling/build-opening-schools.ts

**Notes.** Split Oct 17 from core-old-imports-opening-builders. Tooling only; nothing in play reads these.
