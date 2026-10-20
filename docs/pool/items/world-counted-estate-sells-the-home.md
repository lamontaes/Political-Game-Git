---
id: world-counted-estate-sells-the-home
title: "A counted household's home is sold when its last owner dies, by the same rule as a full household's"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** world-estate-sells-the-home sells a full household's home when probate closes. A counted household's last owner dying (counted estates, removeCountedPerson) leaves the group's home owned forever on the dwellings table, so counted groups never put homes on the market from deaths. A counted household's home should be sold by the same rule times the households its record stands for: the lender paid first from the group's mortgage part, the surplus to the heirs the counted estate names, the home back on the market with a sales row that names the death.

**Rules.** One model, two tiers: the same rule as a full household times its weight. No dice: the sale follows from the death and the estate. Wire to the world: price, payoff and heirs move by journal record. Ask why: the sale row names the death and the estate.

**Done when.** In a one-year run of the played world in a drawn place from all 56 (seed named in the PR body), a counted household whose last owner died has its home sold when its estate closes, with a home-sale row that names the estate and heirs paid, shown in src/core2/counted-estates.test.ts or a new test.

**Files.** src/core2/estates.ts, src/core2/housing-sale.ts, src/core2/modules/residents.ts

**Notes.** TODO
