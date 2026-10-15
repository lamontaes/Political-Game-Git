---
id: core-census-weight-arrears-readers
title: "Arrears, late rent and deposit cash compare weighted money with unweighted records"
area: core
kind: wiring
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: core-census-weight-money
milestone:
source: "found while building core-census-weight-readers, Oct 15"
---

**What.** Three readers compare a group's money with per-record amounts and so must read the weight once money does: `countedOwnersBehind` (`housing-foreclosure.ts`) subtracts each owner's `payment` from the group's arrears, `countedLate` (`housing-homeless.ts`) subtracts each tenant's rent, and `countedDepositTargets` (`credit-deposits.ts`) shares a group's cash by weighted people against a cost buffer already times the weight. Once `core-census-weight-money` makes a group's fund and arrears weighted, each record's payment and rent in these three must be times its weight, so a weight-3 town has three times the households behind, not the same.

**Rules.** One model, two tiers; no dice; replace, never layer.

**Done when.** In a played-world year of a drawn town opened with a count scale above one and money weighted, the households behind on a mortgage or rent and the deposit targets equal the unscaled town's times the scale, named by record id; a town at scale one is identical to base.

**Files.** src/core2/housing-foreclosure.ts, src/core2/housing-homeless.ts, src/core2/credit-deposits.ts

**Notes.** `core-census-weight-readers` made every people count read the weight and left these three, which read money, to this item. The deposit targets' reserve is already times the weight; their cash share is not (it is the group's unweighted fund until the money item lands).
