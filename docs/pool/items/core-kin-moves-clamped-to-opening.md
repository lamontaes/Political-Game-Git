---
id: core-kin-moves-clamped-to-opening
title: "A kin move dated after the opening no longer breaks the opening economy (Valmont, Colorado)"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4653
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `generatedOpening` can write a kin move dated after the opening day and `buildOpeningRetirementIncome` throws 'Past fact outside recipient lifetime/opening' (Valmont, Colorado, key 0880370). The bench catches it and falls back (SG-PLAY-opening-economy-fallback). Clamp kin moves to the opening date in population.ts and delete the fallback.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** The opening of Valmont, Colorado builds the full economy with no fallback, and SG-PLAY-opening-economy-fallback is resolved. Shown in a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, with the test named and the record ids that prove it.

**Files.** src/core2/population.ts, src/bench/world.ts, src/core2/opening-income.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4653 (branch claude/core-kin-moves-clamped): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
