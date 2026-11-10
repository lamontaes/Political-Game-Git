---
id: world-counted-departure-insufficient-group-funds
title: "A counted household's departure crashes the year: Insufficient funds in its group's fund (Larned, Kansas, May of year one)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The played-year golden path (M0-13, tests/golden-path/played-world.node-test.ts) crashes on main 6656fbd2 in Larned, Kansas (GOLDEN_PATH_PLACE_KEY=2038700, GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) on 2025-05-01 with 'Insufficient funds in fund:group:jurisdiction_451abf949449fc2a:town:with-children:income-1:other:30-44:working for counted-departure:household_36ebf1aae0b27cf0:2025-05-01', thrown by transferSplit (accounts.ts:499) from departCountedHousehold (residents.ts:3020) in counted-moves month (counted-moves.ts:1049). The departing household's share of its group's fund is moved out with it, but the group's fund holds less than that share.

**Rules.** One model, two tiers: a counted household leaves with its own share of what its group holds, never more than the group holds, and the year never stops on it. Wire to the world: show the departure record and the fund's balance before and after in the Larned seed. No dice.

**Done when.** The M0-13 played world in Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) plays past 2025-05-01 with household_36ebf1aae0b27cf0's departure recorded and its group's fund at or above zero, and a test that a departure from a group fund holding less than the household's share moves no more than the fund holds.

**Files.** src/core2/modules/residents.ts, src/core2/modules/counted-moves.ts, src/core2/accounts.ts

**Notes.** TODO
