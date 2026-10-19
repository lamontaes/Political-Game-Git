---
id: core-old-imports-opening-employment
title: "The opening's employment allocation comes from the core, not the old town-employment, life-queries and jail-terms code"
area: core
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/old-imports-opening-employment
pr: #5071
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:11:11.377Z
---

**What.** The opening's employment allocation still imports the old town-employment, life-queries and jail-terms code. Port only what the allocation uses into the core and read the core's own copies. Delete the old imports from the opening files in the same change, so nothing is left layered beside the new reads.

**Rules.** Replace, never layer: the old import is deleted in the same change that adds the core's read, and the PR body counts what was removed. One rule, all 56 places: the allocation reads place facts from data and never names a place.

**Done when.** For a drawn place and a seed the builder did not choose, the opening built by `buildBenchWorld` allocates the same jobs by record id before and after, `opening-employment-provenance.test.ts` passes, and a search shows no import of the old town-employment, life-queries or jail-terms modules in the opening files.

**Files.** src/core2/opening-employment.ts, src/core2/opening-employment-provenance.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
