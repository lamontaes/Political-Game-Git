---
id: release-old-core-typecheck-manifest-step
title: "The typecheck gate stops checking the old core's law-consequence manifest"
area: release
kind: cleanup
priority: 1
size: S
status: in-pr
claimed-by: claude/old-core-typecheck
pr: #5833
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-22T05:17:24.652Z
---

**What.** npm run typecheck ends with npm run check:law-consequence-modules, which regenerates src/simulation/law-consequence-module-manifest.ts from src/simulation/law-consequences and fails when it differs. Nothing outside src/simulation reads that manifest, and the old core takes no new modules, so the gate step only keeps the gate tied to code being deleted. Remove the step, its generator and test (scripts/law-consequence-modules/) and their package scripts. This is the gate slice of release-old-core-typecheck; that item's tsconfig include of src/simulation goes when its importers do (core-old-engine-06 and -07), because tsconfig.node.json is a composite project that must list every file its included code imports.

**Rules.** Replace, never layer: the step, its generator, its test and its scripts go in the same change. Red main comes first: the gate must not depend on code being deleted.

**Done when.** npm run typecheck passes without the step; no package script, workflow or vite config names scripts/law-consequence-modules; the release-workflow test passes; the PR lists what was removed.

**Files.** package.json, vite.config.ts, scripts/law-consequence-modules/

**Notes.** TODO
