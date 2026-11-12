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
lead: m0-m2
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** In the two-level opening (src/bench/world.ts), build the population without kin, pick the entrant, build peer contacts and decide the kept set from residents alone, then add kin, temperament and falling-outs for the kept households only, and run the deep past after that. Counted households get none of it at the opening. The historical Vonore measurement (9,940 residents against 39,685 records with kin) identifies the cost of materializing outside relatives, not permission to drop people from the model's counts. Preserve the parent's count, household and inherited-trait contracts while avoiding unnecessary full records. Feeds: core-light-opening.

**Cause.** Found in code: src/core2/population.ts builds kin for all households (`buildOpeningKin`, line 1660) before src/bench/world.ts decides the kept set. Measured: Vonore, Tennessee, 9,940 residents against 39,685 records with kin.

**Fix.** Build the population without kin, pick the entrant, build peer contacts and decide the kept set from residents alone, then add kin, temperament and falling-outs for the kept households only, and run the deep past after. Counted contributions are unchanged.

**Time box.** 5 hours for an Opus session.

**Rules.** One model, two tiers: a counted household has no individual kin until it is filled in, and the counts it contributes to are read by every engine as before. Speed: a town's game year runs in under two minutes; measure the opening before and after on the same machine. Estimate, never unknown: a counted person's kin count shown anywhere is an estimate from the same fertility tables.

**Done when.** A second session, in buildBenchWorld in a drawn place and a seed the builder did not choose, sees kin and temperament records only for kept households, by record id, with the opening time before and after on one machine in the PR body. The tests that read opening kin (src/core2/opening-kin.test.ts, src/core2/fill-in-people.test.ts) are updated to draw a kept household.

**Waits on.** core-light-opening-kin-households, and the owner's Oct 19 ruling in core-opening-counts-from-census.

**Files.** src/core2/population.ts, src/core2/opening-kin.ts, src/core2/opening-personality.ts, src/core2/closeness.ts, src/bench/world.ts

**Notes.** Wider population should fall back toward the town's real count; check births-counted and views-counted readers for anything that expected husk kin in the counts.

This planning split does not authorize changing aggregate population or inherited traits. Read core-light-opening Notes before building; flag any required output change as an owner decision rather than treating this split as its approval.

**Notes (Fable, Nov 10, a second reason to do this).** In Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) the relatives of every household of the town come to 4,576 people placed in the county and 9,363 in the state. The county has 3,717 eligible voters. So the county's own sample is squeezed to 1.4 people, the county opens with no recorded job, and a departure from it stops the year (world-counted-departure-insufficient-group-funds). With relatives made for the kept households only, the county is its sample again.
