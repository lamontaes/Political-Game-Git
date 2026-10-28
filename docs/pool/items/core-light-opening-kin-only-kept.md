---
id: core-light-opening-kin-only-kept
title: "Kin, temperament and falling-outs are built only for the households the opening keeps full"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-light-opening-kin-households
source: split from core-light-opening (M, really L) by the claiming session, Oct 19
claimed-at:
---

**What.** In the two-level opening (src/bench/world.ts), build the population without kin, pick the entrant, build peer contacts and decide the kept set from residents alone, then add kin, temperament and falling-outs for the kept households only, and run the deep past after that. Counted households get none of it at the opening. The historical Vonore measurement (9,940 residents against 39,685 records with kin) identifies the cost of materializing outside relatives, not permission to drop people from the model's counts. Preserve the parent's count, household and inherited-trait contracts while avoiding unnecessary full records.

**Rules.** One model, two tiers: a counted household has no individual kin until it is filled in, and the counts it contributes to are read by every engine as before. Speed: a town's game year runs in under two minutes; measure the opening before and after on the same machine. Estimate, never unknown: a counted person's kin count shown anywhere is an estimate from the same fertility tables.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose, the opening shows kin and temperament records only for kept households, by record id, and the opening time before and after on one machine is in the PR body; the tests that read opening kin (src/core2/opening-kin.test.ts, fill-in-people.test.ts) are updated to draw a kept household.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/opening-personality.ts, src/core2/opening-falling-outs.ts

**Notes.** Wider population should fall back toward the town's real count; check births-counted and views-counted readers for anything that expected husk kin in the counts.

This planning split does not authorize changing aggregate population or inherited traits. Read core-light-opening Notes before building; flag any required output change as an owner decision rather than treating this split as its approval.
