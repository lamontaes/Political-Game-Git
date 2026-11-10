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
checked: fable 2026-11-10
---

**What.** The played-year golden path (M0-13, tests/golden-path/played-world.node-test.ts) crashes on main 6656fbd2 in Larned, Kansas (GOLDEN_PATH_PLACE_KEY=2038700, GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) on 2025-05-01 with 'Insufficient funds in fund:group:jurisdiction_451abf949449fc2a:town:with-children:income-1:other:30-44:working for counted-departure:household_36ebf1aae0b27cf0:2025-05-01', thrown by transferSplit (src/core2/accounts.ts) from departCountedHousehold in counted-moves month (src/core2/modules/counted-moves.ts). The departing household's share of its group's fund is moved out with it, but the group's fund holds less than that share. Speed ran the same seed on main and on its branch on November 9 and both crashed the same way, so the fault is in the departure step itself, not in a recent change.

**Cause.** Needs cause. Looked at: the replay `GOLDEN_PATH_PLACE_KEY=2038700 GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96 node --import tsx tests/golden-path/played-world.node-test.ts` (Larned, Kansas), which threw on 2025-05-01 when a counted household left; `departCountedHousehold` in src/core2/modules/residents.ts (line 3004; the transfer near line 3023); and `householdCashReader` (line 475), which on main gives a household its group fund's balance times its members over the group's people, rounded down, so the amount moved cannot exceed the balance it was read from. Not yet known: whether the replay still throws on today's main, and if it does, what differs between the balance the share was read from and the balance the transfer may spend (a posting between the read and the transfer, or an amount held back).

**Fix.** None until the cause is found.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household leaves with its own share of what its group holds, never more than the group holds, and the year never stops on it. Wire to the world: show the departure record and the fund's balance before and after in the Larned seed. No dice. Every shortcut is a registered stopgap.

**Done when.** A second session (not the builder) runs the M0-13 played world in the named place, Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) and sees it play past 2025-05-01 with household_36ebf1aae0b27cf0's departure recorded and its group's fund at or above zero, and finds a test that a departure from a group fund holding less than the household's share moves no more than the fund holds.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/modules/counted-moves.ts, src/core2/accounts.ts, tests/golden-path/played-world.node-test.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** The first step is the replay on today's main. If it passes, close this item as fixed and name the change that fixed it. Do not cap the share at the balance to make the throw go away: the share is already a part of that balance, so a throw means the two readings disagree, and that is the thing to find.
