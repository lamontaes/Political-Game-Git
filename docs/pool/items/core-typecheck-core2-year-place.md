---
id: core-typecheck-core2-year-place
title: "npm run typecheck fails on main: scripts/core2-year/place.ts import and macro-proof.ts project list"
area: core
kind: bug
priority: 1
status: done
claimed-by: claude/core-typecheck-core2-year-place
pr: #4411
blocked-on:
milestone:
source: "found while running typecheck on claude/laws-reach-group-b-failures"
---

**What.** `npm run typecheck` reports TS5097 at `scripts/core2-year/place.ts(3,49)` (an import path ending in `.ts` without `allowImportingTsExtensions`) and TS6307 at `src/core2/tooling/macro-proof.ts(7,27)` (the file is not in the app project's file list). Neither file is touched by the branches that see it.

**Rules.** Fix at the root; the release gate runs typecheck on the client.

**Done when.** `npm run typecheck` passes on clean main.

**Files.** scripts/core2-year/place.ts, src/core2/tooling/macro-proof.ts, the typecheck project config.

**Notes.** Confirm it is red on clean `origin/main` before changing anything.
