---
id: realistic-test-empty-place-population
title: "The realistic-not-real guard fails when it draws a place the Census holds as empty"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/realistic-empty-place
pr: #6670
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T18:41:03.768Z
---

**What.** The two-seeds guard's population row (audit row 28) asserts that a world's town population differs from the published count. The population engine keeps a place the Census holds as empty at 0 in every world, by its own rule in worldPopulationOf, because a spread around zero has nothing to draw. When the guard draws one of the places published at zero, as it did for Four Mile Road, Alaska (0226835), seed 1735aa89f0ce5894, the check compares 0 with 0 and fails on clean main and on every PR whose CI draws such a place.

**Rules.** Realistic, not real (owner, Oct 27): every place with people still opens off its published count, and the check exempts only a published count of zero, which the engine keeps by rule because nothing can be spread around it. One rule, all 56 places: the fix names no place in logic.

**Done when.** src/core2/realistic-not-real.test.ts passes with REALISTIC_SEED=1735aa89f0ce5894 (Four Mile Road, Alaska, published at zero), and with a second randomly drawn seed whose place has people, where the published-value check still runs and passes; all 16 guards pass.

**Files.** src/core2/realistic-not-real.test.ts

**Notes.** Found Oct 28 by the old engine session on #6658's guards run (job 123007449053); reproduced identically on clean main at 1c603ce88f.
