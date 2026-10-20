---
id: world-renters-can-choose-to-buy
title: "A renter household's choice to buy a home can come out in favor of buying"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5736
blocked-on:
source: split of world-home-turnover (Oct 18)
claimed-at:
---

**What.** In a played year in Selmer, Tennessee (seed 986bb7deee878a6858b40f821e2883c9eed1129a1c6092c0a289e155c7b3b72a, `buildBenchWorld` with twoLevel), the housing engine's monthly buy-or-rent choice for the 45 full renter households was weighed 433 times and came out rent every time. The buy option's score is the baseline of -0.5 minus a cost pull and a down-payment pull that are never positive, against a rent option with no reasons at all, so buying can win only when the monthly payment is below the rent. Give the choice the reasons that really pull a household toward owning (children in the household, the head's age and years in the lease, savings above the down payment, the rent gap) as sliding terms read from the household's records, so a household that can afford a home and has reason to want one buys.

**Rules.** No dice: the choice is a score from the household's own reasons, the loan terms and the money it holds, and nothing flips at a threshold. Every number is a tagged parameter in `src/core2/data/housing/parameters.json` with its spread. Replace, never layer: the old baseline-only terms are rewritten in place, not kept beside the new ones.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, twoLevel, a drawn place from all 56 and the seed named in the PR body) at least one full renter household buys, a `purchase:<householdId>:<date>` row names the reasons that decided it, and the chosen share of renter households per year is checked against the NAR first-time buyer share. A test in src/core2 draws the place and names the seed.

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json

**Notes.** Found Oct 18 splitting world-home-turnover. Measured by wrapping `buyHomes`: 433 considered, 433 chose rent, 37 skipped for no income, 9 for arrears.
