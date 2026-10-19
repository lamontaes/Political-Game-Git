---
id: core-old-imports-population
title: "The opening population builder reads the core's character history, upbringing, traits and world types, not the old engine's"
area: core
kind: cleanup
priority: 2
size: M
status: in-pr
claimed-by: claude/old-imports-population
pr: #5068
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:01:40.192Z
---

**What.** The opening population builder still reads the old engine's character history, upbringing, traits and world types. Read the core's own versions of each, porting only what the builder uses. Remove the old imports in the same change, so the builder reads only the core when it makes a person.

**Rules.** Replace, never layer: the old imports are deleted with the new reads and the PR body counts what was removed. One model, two tiers: a filled-in person must still match what the records say, seeded from the world so the same person returns each time.

**Done when.** For a drawn place and a seed the builder did not choose, `buildBenchWorld` produces the same people by record id before and after, `src/core2/population.test.ts` passes, and no import of the old engine's character history, upbringing, traits or world types remains in the population builder.

**Files.** src/core2/population.ts, src/core2/population.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
