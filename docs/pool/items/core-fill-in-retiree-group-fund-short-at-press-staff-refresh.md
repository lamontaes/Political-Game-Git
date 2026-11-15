---
id: core-fill-in-retiree-group-fund-short-at-press-staff-refresh
title: "A retired household filled in by the press staff refresh finds its group's fund short and throws, stopping a played year"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: Account lead thread, CI golden-path-year M0-13 on PR #9364, Nov 15
after:
standard: 2
model: opus
effort: medium
root: design-life-record
checked: fable 2026-11-15
---

**What.** A played year at East Setauket, New York stops with an error when the press week fills in a household from the counted population and the fund that holds that household's group's money has less than the household's share. It was found by the golden path's year run in CI, not by a player. Seen: the player's year stops in a played world with a thrown error.

**Cause.** Needs cause. Measured: place East Setauket, New York (key 3622964), seed 0ecaac254b3bf4a290cd7169a7bb9e4e34066b3bdb0cbeed2df7b00e34135bed, the played-world test (`GOLDEN_PATH_SEED` and `GOLDEN_PATH_PLACE_KEY` set to those, `node --import tsx tests/golden-path/played-world.node-test.ts`), about 89 s in, on the train head 2190669e with and without PR #9364. The error is "Insufficient funds in fund:group:jurisdiction_d1ef7e7093ac6f83:town:with-children:income-4:other:65-plus:retired for fill-in:household_b6bc489444597599:76:cash", thrown in `transferSplit` (accounts.ts:596) from `releaseResidentHousehold` (modules/residents.ts:2155), called by `fillInPerson` (state.ts:2506) from `refreshPressStaff` (modules/press.ts:3864) in `pressWeek`. What is not yet known is why the retired group's fund holds less than the sum its households are due: the opening fund, an earlier fill-in taking more than its share, or retirees' flows drawing it down.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the counted group and the filled-in household read the same money. Wire to the world: proven in the played world at the place and seed above, then at one more drawn place named with its seed. No new stopgap.

**Done when.** A second session runs the played-world test at East Setauket (seed above) and one more drawn place and the year completes with no insufficient-funds error, and the retired group's fund after every fill-in equals what the group held at opening less what its filled-in households took, named by account id.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/modules/press.ts, src/core2/state.ts

**Notes.** Red on the train head without PR #9364 (checked at 2190669e, same place and seed), so not caused by it. Found in CI's golden-path-year run, which is outside the PR gate.
