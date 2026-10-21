---
id: world-estate-sells-the-home
title: "A home whose owners have all died is sold when its estate closes"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5735
blocked-on:
source: split of world-home-turnover (Oct 18)
claimed-at:
---

**What.** `sellHome` is called from only one place, a household's last members moving away (`moves.departure`), so a home whose owners have all died stays on the dwellings table as owned forever, its mortgage unpaid or paid by a dead person's account. When the last owner of a home dies, the estate sells it when probate closes: the lender is paid first, the surplus goes to the heirs the estate already names, and the home goes back on the town's market with a `sales` row that gives the reason. This gives the town the sales its deaths really cause and frees the home for a buyer.

**Rules.** No dice: the sale follows from the death and the estate's own record, and its price is the dwelling's value on the dwellings table. Wire to the world: the price, the payoff and the heirs' shares move by journal record. One model, two tiers: a counted group's last owner dying sells the group's home by the same rule, times the count. Ask why: the sale row names the death and the estate.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) a household whose last owner died has its home sold at the estate's close, a `home-sale:<householdId>:<date>` row in the housing `sales` table names the estate and the heirs paid, the mortgage row ends, and a test in src/core2 names the place and seed.

**Files.** src/core2/housing-sale.ts, src/core2/estates.ts, src/core2/modules/housing.ts

**Notes.** Found Oct 18 splitting world-home-turnover. Read core-counted-estates (done) first for the counted estate path.

Sent back 2026-10-20 from PR #5735 (branch claude/estate-sells-home): docs/pool/items/world-estate-sells-the-home.md:20 requires a one-year played-world proof with the seed in the body and a sale row naming the estate and heirs paid. src/core2/estate-home-sale.test.ts instead forces household members dead, calls settleEstate directly, and advances 40 plus 280 days; its assertions check estate value but never heirs paid. Add the named ordinary-world proof and heir payment ids; retain this forced-death case as an edge test.; finish on that branch, merge main into it first.
