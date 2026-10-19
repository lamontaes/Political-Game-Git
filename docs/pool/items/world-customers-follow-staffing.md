---
id: world-customers-follow-staffing
title: "Customers move away from a seller that has lost its staff, toward rivals with room"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from world-customers-move-between-sellers
---

**What.** A seller whose staff left or were laid off has less capacity than its customers' spending, so its customers' purchases move month by month toward rivals of the same kind that have room. The Oct 16 attempt moved customers by price and capacity and found almost no movement, because every seller's price follows the same wage and price indexes (median spread 0.06 percent). This item names one cause that does differ between sellers and moves customers by it, contract by contract for counted purchase flows (the pattern of shiftToOpenSellers) and in full households' living plans, keeping every household's total unchanged.

**Rules.** No dice: the move follows the cause, never a roll. One model, two tiers: counted and full buyers move by the same rule, times their count. One rule, all 56 places: no place named in logic. The chain is the acceptance: a lost customer is followed to the firm's shrinking sales and its layoff, by record id. OWNER DECISIONS NEEDED if this cause is not the one he wants: register a stopgap of kind owner-decision.

**Done when.** A seller that loses staff loses customers in proportion to its lost capacity and a rival that gains them hires, shown by the two businesses' records. In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, layoffs at shrinking firms follow their lost customers by business and purchase-flow record ids, and the monthly layoff rate is reported against JOLTS.

**Files.** src/core2/modules/residents.ts, src/core2/modules/business.ts

**Notes.** Split Oct 19 from world-customers-move-between-sellers, which was handed back twice because it named no cause. Build one cause per item; the three splits are alternatives, not a sequence, and the first one built should say whether the others are still wanted.

Built and measured Oct 19, not shipped (claude/customers-follow-staffing, local). The move: each month a firm's service level (staff against the staff its sales call for, from the jobs review) sets a share of its counted customers' purchases, 0.1 per unit of lost service, to move contract by contract to rivals weighted by their service; `shiftToOpenSellers` generalized into `moveCustomers`. In Largo, Maryland (seed 7106c3344e6a6f33, buildBenchWorld, one year, same world with the move off and on) layoffs were 119 both ways, a monthly layoff rate of 0.29 percent of jobs against about 1.1 percent in JOLTS. Understaffing is rare in this model because a firm's staffing target follows its own staff and sales, so service stays near 1 and almost nothing moves. This cause does not produce the missing layoffs; do not build it again as written. A cause that needs a firm to be short of staff only works if hiring is slower than leaving, which is the hiring gap in world-hires-below-jolts.

