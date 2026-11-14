---
id: tests-played-world-no-rental-tiny-town
title: "M0-13's housing check fails in a 19-home town: no home ever rented where the records expect 2 renter households (Rachel, West Virginia)"
area: world
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: m0-m2
model: haiku
effort: low
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The played-world check M0-13 (tests/golden-path/played-world.node-test.ts, "homes have values and rents") failed on main in Rachel, West Virginia (place 5466460, seed fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa), replayed by Lane 5 on Nov 4: 0 of 19 homes lack a value or rent, but 0 were ever rented where the records expect 2 renter households. It turned a golden-path-year run red though that pull request changed only a test fixture. Either the two expected renters are counted households that never reach a dwelling lease, or housing seeds no rental where so few homes exist. Guards: the homes and rents a tiny town shows on the housing screen, which the golden-path played-world test (M0-13) keeps working.

**Cause.** Measured: Rachel, West Virginia (5466460), seed fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa, does not reproduce, and the town no longer opens as it did. On Nov 10 (main b4422d346c) the played-world check with GOLDEN_PATH_SEED=fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa and GOLDEN_PATH_PLACE_KEY=5466460 passed 'homes have values and rents' with 823 homes priced, 226 rented and 107 renter households expected, where the Nov 4 failure had 19 homes and 2 renter households expected; a fresh draw passed too (838 homes, 232 rented). The opening that made a 19-home Rachel, West Virginia is gone, so the case cannot be replayed; nothing in the two runs points at housing seeding no rental.

**Fix.** Nothing to build. Proposed for the CTO: close this item, with the two Nov 10 runs. If a tiny town again shows renter households expected and none rented, file it with the town's homes and households by record id.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: name by record whether the two renter households are full or counted and why neither holds a lease, before any change. One model, two tiers: a counted renter household rents by the same rule as a full one. Never loosen the check to skip small towns; that is a known cheat.

**Done when.** A second session replays the played-world check in Rachel, West Virginia on its seed and sees the PR name each of the 2 expected renter households by record id and why it held no lease. After the fix, tests/golden-path/played-world.node-test.ts passes there and in two more drawn places named with seeds, with the housing assertion unchanged.

**Waits on.** Nothing.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/housing.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** `node --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` with GOLDEN_PATH_SEED=fab4a016e500e2d54ef9dd438fd9575efa4a0053bb25048fd4df627589dcc0aa (also with GOLDEN_PATH_PLACE_KEY=5466460): "homes have values and rents" passed (823 homes priced, 226 rented, 107 renter households expected). The seed and place key did not give Rachel's 19 homes, so the item's town was not reproduced. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-rental-1 (place not printed): passed (838 homes, 232 rented). Green on both, but the item's tiny town is not proven; no drop proposed.

Cause finder (Nov 11, 2026, for Fable B): read the Nov 10 re-run against the Nov 4 failure; the same seed and place key now open a town of 823 homes, not 19. Proposed: close.

Dropped Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: the town (19 homes) no longer opens: the same seed and place key now give 823 homes. The 'homes have values and rents' check at `tests/golden-path/played-world.node-test.ts` line 942 requires a rented home only where the records expect a renter household, so a tiny town with none expected passes. Not re-run here (golden path).
