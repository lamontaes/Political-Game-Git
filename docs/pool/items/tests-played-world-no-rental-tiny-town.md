---
id: tests-played-world-no-rental-tiny-town
title: "M0-13's housing check fails in a 19-home town: no home ever rented where the records expect 2 renter households (Rachel, West Virginia)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: m0-m2
model: opus
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The played-world check M0-13 (tests/golden-path/played-world.node-test.ts, "homes have values and rents") failed on main in Rachel, West Virginia (place 5466460, seed fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa), replayed by Lane 5 on Nov 4: 0 of 19 homes lack a value or rent, but 0 were ever rented where the records expect 2 renter households. It turned a golden-path-year run red though that pull request changed only a test fixture. Either the two expected renters are counted households that never reach a dwelling lease, or housing seeds no rental where so few homes exist. Guards: the golden-path played-world test (M0-13), which is red in a tiny town, and the homes and rents the town shows.

**Cause.** Needs cause. Looked at tests/golden-path/played-world.node-test.ts lines 885 to 909 (the "homes have values and rents" check and expectedRenterHouseholds) and src/core2/modules/housing.ts: whether the two renter households are full or counted, and why neither holds a lease, was not read. Measured: Rachel, West Virginia, seed fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Ask why: name by record whether the two renter households are full or counted and why neither holds a lease, before any change. One model, two tiers: a counted renter household rents by the same rule as a full one. Never loosen the check to skip small towns; that is a known cheat.

**Done when.** A second session replays the played-world check in Rachel, West Virginia on its seed and sees the PR name each of the 2 expected renter households by record id and why it held no lease. After the fix, tests/golden-path/played-world.node-test.ts passes there and in two more drawn places named with seeds, with the housing assertion unchanged.

**Waits on.** Nothing.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/housing.ts

**Notes.** TODO
