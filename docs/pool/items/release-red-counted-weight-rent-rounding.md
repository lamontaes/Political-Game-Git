---
id: release-red-counted-weight-rent-rounding
title: "counted-weight-money: a counted household's rent comes out 28 cents over its bound (Weiser, Idaho, seed 65d017ef)"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In counted-weight-money.test.ts the rent of a household with weight 3 came to 200985 minor against a bound of 200957 (one household paid 66985; 3 times that is 200955, plus 2 slack): rent:household_ec01b40aad5f78fa@2025-02-01 in Weiser, Idaho (place 1686140), seed 65d017ef5d56e8007221da855421dc483eaf11453c97617bf168bebdcaf03857. Find whether the counted group pays more than the single household times its weight, or the weight is rounded differently from the single household's rent, and fix it at the cause.

**Rules.** Wire to the world: a counted group pays its rent times its weight, the same rule as a full household. Every dollar balances. No dice.

**Done when.** In the same place and seed (play the test with CWM_SEED and CWM_KEY set) the weight-3 household's rent is within the test's rounding slack of the single household's rent times 3, the test passes there, and src/core2/counted-weight-money.test.ts passes on six random draws.

**Files.** src/core2/counted-weight-money.test.ts, src/core2/residents.ts

**Notes.** Seen once in 12 runs while fixing #5331 (fixer PR #5677); the check is on main, not in that PR.
