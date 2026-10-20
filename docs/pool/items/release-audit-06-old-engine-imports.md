---
id: release-audit-06-old-engine-imports
title: "Move the types town-workplaces.ts and work-schedules.ts take from src/simulation into core2 (#5093, #5097)"
area: release
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:25:36.732Z
---

**What.** Move the imported types into core2, remove the dangling town-employment-mix.ts line from tsconfig.node.json, and close #5084 as a duplicate carried in by #5097.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The tripwire that forbids src/simulation imports in src/core2 passes, typecheck passes, tsconfig.node.json names no missing file, and a test run of the two modules in a drawn place and seed is unchanged.

**Files.** src/core2/town-workplaces.ts, src/core2/work-schedules.ts, tsconfig.node.json

**Notes.** Item 6 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
