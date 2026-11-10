---
id: world-counted-departure-insufficient-group-funds
title: "A counted household's departure crashes the year: Insufficient funds in its group's fund (Larned, Kansas, May of year one)"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
---

**What.** The played-year golden path (M0-13, tests/golden-path/played-world.node-test.ts) crashes on main 6656fbd2 in Larned, Kansas (GOLDEN_PATH_PLACE_KEY=2038700, GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) on 2025-05-01 with 'Insufficient funds in fund:group:jurisdiction_451abf949449fc2a:town:with-children:income-1:other:30-44:working for counted-departure:household_36ebf1aae0b27cf0:2025-05-01', thrown by transferSplit (src/core2/accounts.ts) from departCountedHousehold in counted-moves month (src/core2/modules/counted-moves.ts). The departing household's share of its group's fund is moved out with it, but the group's fund holds less than that share. Speed ran the same seed on main and on its branch on November 9 and both crashed the same way, so the fault is in the departure step itself, not in a recent change.

**Cause.** Measured: GOLDEN_PATH_PLACE_KEY=2038700 GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96 node --import tsx tests/golden-path/played-world.node-test.ts (Larned, Kansas) throws on 2025-05-01. The cause in code: departCountedHousehold in src/core2/modules/residents.ts (transferSplit near line 3023) moves householdCash(rt, h) out of the group fund without checking the fund's balance.

**Fix.** Cap the departing household's cash share at the group fund's balance, record the shortfall as a registered stopgap if the books need it, and add a test for a departure when the fund holds less than the household's share.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household leaves with its own share of what its group holds, never more than the group holds, and the year never stops on it. Wire to the world: show the departure record and the fund's balance before and after in the Larned seed. No dice. Every shortcut is a registered stopgap.

**Done when.** A second session (not the builder) runs the M0-13 played world in the named place, Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) and sees it play past 2025-05-01 with household_36ebf1aae0b27cf0's departure recorded and its group's fund at or above zero, and finds a test that a departure from a group fund holding less than the household's share moves no more than the fund holds.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/modules/counted-moves.ts, src/core2/accounts.ts, tests/golden-path/played-world.node-test.ts

**Notes.** TODO
