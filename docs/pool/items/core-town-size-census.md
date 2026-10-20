---
id: core-town-size-census
title: "A town opens at its real Census size (population.ts still caps above 10,000)"
area: core
kind: bug
priority: 1
status: blocked
claimed-by: claude/political-game-pool-3xfqef-5
pr:
blocked-on: world-census-weight-owner-draws
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-20T00:21:16.165Z
---

**What.** The ruling says a town opens at its real Census size, but population.ts still caps above 10,000. Fix at the root.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** A drawn town above 10,000 opens at its Census count; the speed guard still passes.

**Files.** src/core2/population.ts

**Notes.** Ruling: "a town opens at its real Census size; nothing pads it to 10,000." (core-od-town-size). The register audit (Oct 15) could not find the cap in current code; verify in a played world of a town above 10,000 before changing anything; close as done if it already opens at Census size.

Split (Oct 15, L): the cap is real. `buildPopulation` still takes `Math.min(target, real)` (`src/core2/population.ts`), and a town cannot open at millions of household records. Parts: core-census-weight-model, core-census-weight-money, world-census-weight-economy, elections-census-weight-electorate, core-census-uncap-opening. This item closes when the last one merges.
