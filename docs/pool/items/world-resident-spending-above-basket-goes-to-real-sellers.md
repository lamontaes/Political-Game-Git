---
id: world-resident-spending-above-basket-goes-to-real-sellers
title: "What a town household spends above its basket leaves the town instead of going to the sellers it would really buy from"
area: world
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "asked for by the Account lead on the resident spending build, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-14
---

**What.** A town household that spends by its pay (world-resident-spending-follows-income) buys local goods only up to the Consumer Expenditure basket: the opening's service contracts are capped at the basket's categories, and the rest of the plan is paid as one monthly outside living cost to sellers outside the town. A well-paid household's extra spending therefore leaves the town, and the town's businesses see none of it. Seen: at Gibraltar MI, seed pt8:0, a year-1 run shows 19 people in the player's circle paying a monthly outside living cost after the change where 2 did before, and no local seller receiving the difference.

**Cause.** Found in code: `src/core2/opening-customers.ts` and `src/core2/opening-finance.ts` budget each household's local purchases as `min(available, sourceMonthly)` over the basket's categories (`worldMonthlyHouseholdLivingCosts`), and `src/core2/residents.ts` (around line 753) pays the unbound remainder of the plan, `assigned - boundMonthlyByHome`, as one outside flow. Nothing spreads the part of the plan above the basket across the sellers the household would buy from.

**Fix.** Design: scale each category's local budget by the household's plan over its basket (the same ratio, so the shares of the categories stay the basket's), send each category's part to the town's sellers of that kind in shares by their capacity as the opening already does, and leave only what no local seller of that kind could sell (and rent above the Fair Market Rent that the housing engine pays) as the outside flow. Measure year 1 and time per record at three places with and without, and the share of household spending that stays in town.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the spending moves money to named local businesses and the same counted-household rule applies times the count; one model, two tiers; no dice; replace, never layer: the capped categories are scaled in place, no second spending path.

**Done when.** A second session, not the builder, runs a one-year played world (buildBenchWorld) at a drawn place and seed it names and sees the local sellers' sales from households rise with the households' pay, the outside living cost fall by the same amount, and a named household's monthly purchases traced by record id from its plan to a named seller.

**Waits on.** The resident spending build (world-resident-spending-follows-income) folding.

**Files.** src/core2/opening-customers.ts; src/core2/opening-finance.ts; src/core2/residents.ts

**Notes.** Found while tracing the Gibraltar kept-receipts change in world-resident-spending-follows-income.
