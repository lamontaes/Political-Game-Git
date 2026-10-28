---
id: release-old-core-typecheck
title: "Take the old core out of npm run typecheck so the gate survives deleting src/simulation"
area: release
kind: cleanup
priority: 1
size: S
status: in-pr
claimed-by:
pr: #6659
after:
blocked-on: core-old-engine-07-appearance-and-delete
source: "repo audit Oct 19 (docs/reports/repo-audit-2026-10-19.md)"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. `npm run typecheck` reads `src/simulation/law-consequences`, so the gate breaks the moment the old core is deleted. The typecheck script runs `check:law-consequence-modules`, which runs `scripts/law-consequence-modules/generate-manifest.mjs --check` against that folder and the manifest it writes, `src/simulation/law-consequence-module-manifest.ts`. The old-core step comes out of the typecheck, and so does any tsconfig project that includes src/simulation. The law-consequences reads are pointed at core2's laws data, or deleted where core2 already carries them. This must land before core-old-engine-07-appearance-and-delete.

**Rules.** Red main comes first: a gate that depends on code being deleted is a defect fixed at the root, so this item lands before the deletion it blocks. Replace, never layer: the old-core step is removed from the gate, not kept beside a new core2 check. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `npm run typecheck` passes on a branch where `src/simulation` is removed, no tsconfig or script under scripts/ names `src/simulation`, the release-workflow test passes, and the PR body lists the configs changed. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** package.json, tsconfig*.json, scripts/law-consequence-modules/generate-manifest.mjs, scripts/law-consequence-modules/generate-manifest.test.mjs

**Notes.** Found by the repo audit Oct 19. `tsconfig.node.json` includes `src/simulation/**/*.ts`. Parent of the appearance-and-delete step: core-old-engine-07-appearance-and-delete.
