---
id: world-macro-outside-outlays-indexed
title: "The outside account's outlays reach output as indexed totals so a federal line moves the nation"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
after: world-macro-federal-dollar-finish
blocked-on:
source: "trial PR #4990's finding; acting CTO, Oct 19"
---

**What.** One town is its share of the nation, so a federal line the player passes barely moves national output when only the town's own chain is followed (1.8e-8 of output in the trial). The outside account's outlays and other places' budgets reach the same payout engines as indexed totals, counted at the coarser tier, so national output is the sum over all places of dollars paid and spent, the town in full and the rest by index. This is the registered replacement of SG-WORLD-macro-public-budget; the stopgap is resolved when the indexed totals are read.

**Rules.** One model, two tiers: other places are counted at a coarser level by the same rule the town's own payroll and purchases follow. No dice: the indexed totals derive from the budgets and census data for those places, never a drawn or fixed share.

**Done when.** A one-year played world in a drawn place (`buildBenchWorld`, every module installed) shows a federal budget change moving national output within the researched band (`macroFederalOutlayResponseBand` in src/core2/data/macro/parameters.json) through indexed outside totals plus the town's own chain, by record id from the budget line to the indexed payout; the economy page shows the movement; SG-WORLD-macro-public-budget is resolved and a test names the place and seed. The owner plays it: passing a federal budget shows the country's economy answer, not a rounding error.

**Files.** src/core2/modules/macro.ts, src/core2/budgets-treasury.ts, src/core2/data/macro/parameters.json

**Notes.** Found by the GLM 5.3 trial on branch trial/glm/federal-dollar (#4990). Waits on world-macro-federal-dollar-finish so the chain it extends is on main first.

Checked Oct 20 (claude/peaceful-ritchie-03780x): SG-WORLD-macro-public-budget is already resolved (owner, Oct 16: no multiplier; a federal dollar is followed through who is paid and what they spend). `macroFederalOutlayResponseBand` does not exist in src/core2/data/macro/parameters.json, so the band is sourced research still to be done, and the chain this extends is in #4990, unmerged. Build after #4990 merges, with the band added from sources and used only as a check on the totals.
