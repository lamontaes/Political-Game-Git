---
id: world-estate-sells-the-home
title: "A home whose owners have all died is sold when its estate closes"
area: world
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/estate-sells-home
pr:
blocked-on:
source: split of world-home-turnover (Oct 18)
claimed-at: 2026-10-20T16:21:01.145Z
---

**What.** `sellHome` is called from only one place, a household's last members moving away (`moves.departure`), so a home whose owners have all died stays on the dwellings table as owned forever, its mortgage unpaid or paid by a dead person's account. When the last owner of a home dies, the estate sells it when probate closes: the lender is paid first, the surplus goes to the heirs the estate already names, and the home goes back on the town's market with a `sales` row that gives the reason. This gives the town the sales its deaths really cause and frees the home for a buyer.

**Rules.** No dice: the sale follows from the death and the estate's own record, and its price is the dwelling's value on the dwellings table. Wire to the world: the price, the payoff and the heirs' shares move by journal record. One model, two tiers: a counted group's last owner dying sells the group's home by the same rule, times the count. Ask why: the sale row names the death and the estate.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, a drawn place from all 56, seed named in the PR body) a household whose last owner died has its home sold at the estate's close, a `home-sale:<householdId>:<date>` row in the housing `sales` table names the estate and the heirs paid, the mortgage row ends, and a test in src/core2 names the place and seed.

**Files.** src/core2/housing-sale.ts, src/core2/estates.ts, src/core2/modules/housing.ts

**Notes.** Found Oct 18 splitting world-home-turnover. Read core-counted-estates (done) first for the counted estate path.

Oct 20 (claude/estate-sells-home): built for full households. `settleEstate` keeps an estate open when the decedent was the last living member of a household that owns its home, even with no cash in it; `distribute` (probate closes) calls `sellHome` with the estate (`housing-sale.ts`), which pays the lender first from the outside market's price and credits the surplus to the decedent's account, so the estate tax and the heirs count it. The sale row names `decedentId` and `deathEventId`. Test: estate-home-sale.test.ts (drawn place, a household that owns its home, all its members die, 280 days on: `home-sale:<household>:<date>` with reason `estate.probate-closes`, the lender paid, the dwelling `sold`, the mortgage ended, the court record holding the surplus). Not done: a counted household's home (filed as world-counted-estate-sells-the-home; SG-CORE-estate-cash-only now names it), and the heirs are not given the home to live in.
