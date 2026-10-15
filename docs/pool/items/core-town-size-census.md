---
id: core-town-size-census
title: "A town opens at its real Census size (population.ts still caps above 10,000)"
area: core
kind: bug
priority: 1
status: blocked
claimed-by:
pr:
blocked-on: core-counted-opening-wiring
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
---

**What.** The ruling says a town opens at its real Census size, but population.ts still caps above 10,000. Fix at the root.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** A drawn town above 10,000 opens at its Census count; the speed guard still passes.

**Files.** src/core2/population.ts

**Notes.** Ruling: "a town opens at its real Census size; nothing pads it to 10,000." (core-od-town-size). The register audit (Oct 15) could not find the cap in current code; verify in a played world of a town above 10,000 before changing anything; close as done if it already opens at Census size.

**Split (claude/political-game-pool-g2977r).** The cap is real: `buildPopulation` takes `min(targetPopulation = 10,000, Census count)` (population.ts:512-519). It stands in for speed, not a design choice: every opening person is first a full record, then collapsed. Measured on Johnstown, Colorado (22,433 people): 42 s and 2.9 GB at the cap, 105 s and 4.7 GB when the full count is built. New York would need about 8.6 million records. This is L work, split into `core-counted-opening-generator` and `core-counted-opening-wiring`. This item is done when both land.
