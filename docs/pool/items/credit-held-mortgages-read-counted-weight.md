---
id: credit-held-mortgages-read-counted-weight
title: "The town bank's books count a counted owner's mortgage once, though the record stands for many households and pays as many"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-counted-renters-buy
blocked-on:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: Account lead T54 2026-11-14
source: Account lead T54 building world-counted-renters-buy (Nov 14, 2026)
---

**What.** A counted household record that stands for several households (its weight) owes its mortgage once per household: housing's `mortgages` row keeps one household's balance, and the counted mortgage flow pays the row's payment times the weight. The town bank's books (`heldMortgages` in src/core2/modules/credit.ts) add each row's balance once, at the opening and in play, so for a weighted record the bank takes in the weight's payments while its held loans fall by one household's principal: its capital, its room to lend and its appetite (`bankAppetite`) drift. Seen: the bank's lending (a business's credit line, a renter's mortgage) in a large place whose counted records carry weights over one (Bloomingdale, New Jersey: weights up to about 1,200 in the county sample).

**Cause.** Found in code: `heldMortgages` (src/core2/modules/credit.ts, near line 451) sums `balanceMinor` of the `mortgages` rows and of the opening's `housingMortgages` metadata without the record's weight (`CountedStore.weightOf`); `amortize` (src/core2/modules/housing.ts) and `sellHome` (src/core2/housing-sale.ts) treat the row as one household's and multiply by the weight where money moves. The opening's choice of holder (`openingMortgages`, src/core2/housing-mortgages.ts) also compares one household's balance with the bank's room.

**Fix.** In `heldMortgages`, multiply each row's balance by its household's weight (the counted store's `weightOf`, one for a full household), for the opening total and today's; in `openingMortgages`, compare and spend the room with the balance times the record's weight. Prove in a weighted place that the bank's equity moves by exactly what it lends and is repaid over a year.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One model, two tiers: a weighted record's loan is the weight's loans on every reader. Money moves only through the existing accounts; no new tracking.

**Done when.** A second session runs a year in a drawn place with weighted counted owners and sees the bank's equity change by the interest it earned less losses, by record id of the bank and the mortgages rows, with the pinned test in src/core2/housing-counted-buy.test.ts still passing.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/housing-mortgages.ts

**Notes.**
