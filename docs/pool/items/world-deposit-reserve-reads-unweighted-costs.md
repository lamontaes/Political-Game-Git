---
id: world-deposit-reserve-reads-unweighted-costs
title: "A business's deposit reserve reads its other costs at the sample size while its sales run at the town's weight"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-world-deposit-reserve-reads-unweighted-costs
---

**What.** In src/core2/credit-deposits.ts the deposit reserve a business keeps in cash was figured from the book's annualOtherCostsMinor, which is not multiplied by the town's count weight, while its sales and purchases are. In Opelika, Alabama (0157048, seed op1, scale 3.5765) a wholesaler put 6.43 billion minor units in the bank, 8.2 times the sample's deposits for 3.55 times the flows, and held no cash on its payday. The aggregate slice landed under world-deposit-reserve-reads-unweighted-costs-aggregate (done, #5791): the reserve now multiplies payroll and other costs by the business's staffed scale. What is left is this item's own acceptance, that each business's deposits over its weighted flows sit inside a stated spread of the same town's ratio at the sample size, per business and not as a town aggregate, because a single firm's ratio swings either way on a given day. Guards: the town's money numbers, where a wholesaler banked 8.2 times too much; no player opens that figure, but every price and loan reads it.

**Cause.** Found in code: src/core2/credit-deposits.ts (the reserveMinor of each business, near line 122) now multiplies annualPayrollMinor + annualOtherCostsMinor by staffedScale (src/core2/residents-economy.ts line 271), so the weight is applied there; the per-business proof the item asks for has not been run, and a firm whose cash is the sample's opening stock rather than weighted (item Notes, Oct 21) may still differ.

**Fix.** Run the per-business check in a one-year world at Census scale; if a business's deposits over its weighted flows sit outside the stated spread, find the reader that still uses an unweighted cash or cost figure and weight it the way the other readers of a business's book do.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: every reader of a business figure multiplies by the weight the same way. Wire to the world: the deposits and the cash on hand move on the journal, shown in a played year. Ask why: a business whose ratio differs is explained by its own records before any number moves.

**Done when.** A second session (not the builder) plays a one-year world built with `buildBenchWorld` at Census scale in a drawn place above 10,000 (seed named) and sees each business's deposits over its weighted flows inside a spread stated per business of the same town's ratio at the sample size, named by organization id, in a test in src/core2; any business outside the spread is explained by a record. On screen: nothing yet; it would show on Politics, Issues and Government, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/credit-deposits.ts, src/core2/residents-economy.ts

**Notes.** Found by the helper working world-census-scale-closures-rise (PR #5553); closures no longer follow from it since payroll draws savings.

Measured Oct 21 (claude, claude/deposit-reserve), tried and reverted. Opelika, Alabama (0157048, seed op1), 120 days, default size against countScale 3.5765, 37 businesses either way (38 with a newspaper added at scale). Before any change: received 13.68 bn at the default size and 46.31 bn at scale (3.38 times); deposits 574 million and 6,381 million (11.1 times, which is the item's finding); business cash 7.54 bn and 9.72 bn (1.3 times); booked payroll and other costs unchanged (5.13 bn and 40.9 bn a year). The books are the sample's while sales run at the weight, as the item says. Tried: reserve from the larger of the booked other costs and the booked cost share (other costs over demand) of the sales received per month since the game began. Result: deposits 533 million at the default size (about 7.1 percent lower) and 55 million at scale (0.1 times the default, for 3.4 times the flows); business cash rose to 16.0 bn, because the reserve now takes 3.4 times the costs while cash is only 2 times: the firms' cash is the sample's opening stock, not weighted. So the deposit ratio lands about 33 times too low instead of 3 times too high, for this tested reserve formula; it does not establish that every reserve rule over that cash must fail. This historical snapshot predates the weighted-opening-cash work merged with #5553. Recheck the current cash, capital and cost readers before choosing the next correction (world-census-scaled-establishments-short and world-census-weight-economy track the sizing). The change is reverted; this item's Done when stays open.

Sent back 2026-10-23 from PR #5791 (branch claude/deposit-reserve-weighted): The table substitutes 120 days and a town aggregate for the required year and per-business ratio bounds, and the diff has no release declaration; supply the actual acceptance or track a bounded slice; finish on that branch, merge main into it first.

Fixer, Oct 27: the aggregate slice (the town's deposits per weighted flow at Census scale against the sample, 120 days, by the shared staffed scale) moved to `world-deposit-reserve-reads-unweighted-costs-aggregate` (PR #5791). This item stays open for its Done-when as written: a one-year played world with each business's deposits over its weighted flows inside a stated spread of the sample's, by organization id; Merger 1 and the PR body both found a single firm's ratio swings either way on a given day, so that proof needs a spread stated per business, not a town aggregate.

**Notes (pool redo, Nov 10).** Kept with a changed premise: the proposed cause (the line reads costs without the count weight) no longer holds on main, because credit-deposits.ts now applies staffedScale to the reserve (the aggregate slice, #5791). The item is kept for its per-business proof.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:23 UTC) on branch claude/pool-world-deposit-reserve-reads-unweighted-costs.

Released (2026-11-11): Re-claimed by my own next loop, not worked; see my earlier release note on this item (world-deposit-reserve-reads-unweighted-costs: the weighting is already applied at credit-deposits.ts ~122; what remains is a per-business proof at Census scale, and the spread it must sit inside is a number nobody has stated, so it needs that number first). Continue on branch claude/pool-world-deposit-reserve-reads-unweighted-costs.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:24 UTC) on branch claude/pool-world-deposit-reserve-reads-unweighted-costs.

Released by next (2026-11-13): no push to claude/pool-world-deposit-reserve-reads-unweighted-costs since 2026-11-11 06:23 UTC, more than twice its 4-hour time box. Continue on branch claude/pool-world-deposit-reserve-reads-unweighted-costs.
