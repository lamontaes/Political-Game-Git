---
id: world-counted-departure-insufficient-group-funds
title: "A counted household's departure crashes the year: Insufficient funds in its group's fund (Larned, Kansas, May of year one)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-world-counted-departure-insufficient-group-funds
pr: #8291
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:18:46.100Z
---

**What.** The played-year golden path (M0-13, tests/golden-path/played-world.node-test.ts) crashes on main 6656fbd2 in Larned, Kansas (GOLDEN_PATH_PLACE_KEY=2038700, GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) on 2025-05-01 with 'Insufficient funds in fund:group:jurisdiction_451abf949449fc2a:town:with-children:income-1:other:30-44:working for counted-departure:household_36ebf1aae0b27cf0:2025-05-01', thrown by transferSplit (src/core2/accounts.ts) from departCountedHousehold in counted-moves month (src/core2/modules/counted-moves.ts). The departing household's share of its group's fund is moved out with it, but the group's fund holds less than that share. Speed ran the same seed on main and on its branch on November 9 and both crashed the same way, so the fault is in the departure step itself, not in a recent change.

**Cause.** Measured: in Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) the replay `GOLDEN_PATH_PLACE_KEY=2038700 GOLDEN_PATH_SEED=0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96 node --import tsx tests/golden-path/played-world.node-test.ts` still throws on main 8f2a7f2725 (Nov 10), within the first minute. At the throw the departing record (household_36ebf1aae0b27cf0, six members) carries a weight of 0.00417, so it stands for a small fraction of one household. Its group holds 37 such records, 3.6 people in all, and a fund of 727,856. The share asked for is 1,212,916. Found in code: `departCountedHousehold` in src/core2/modules/residents.ts (line 3004) takes `householdCash(rt, h)` (line 3019). That is `householdCashReader` (line 475), whose line 491 gives the fund's balance times the record's plain member count over the group's weighted people (`peopleInGroup`, src/core2/counted-money.ts line 72). That is one real household's share, which is right for a fill-in. A departure is different: it retires the whole record (`store.retire`), and its caller sizes it by `store.weightedCount(next)` (src/core2/modules/counted-moves.ts line 997). So the money taken is 1 over the weight times too much for a record of weight below one, and can pass the whole fund; for a weight above one it is too little, and the households that left leave their cash behind. Why the weight is below one here is a second fault with its own items: in `withCountySample` (src/core2/opening-county-sample.ts line 288) the relatives already placed in the county (4,576 people, 3,817 adults) outnumber the county's 3,717 eligible voters, so the sample's 241 adults share the floor of one voter.

**Fix.** In `departCountedHousehold`, take the record's own share instead of one household's: the fund's balance times `store.weightedCount(h)` over `peopleInGroup(rt, h.group)`, rounded down, and zero when the group has no people. Leave `householdCash` and `householdCashReader` as they are, because their other readers (fill-in, credit, jobs, housing, estates) want one real household's cash. Add a test in src/core2/counted-departure-share.test.ts with two cases: a group whose records carry a weight of one half, where a departure moves no more than the fund holds; and a group whose records carry a weight of three, where a departure moves three households' share. Do not cap the amount at the balance. Departures from weighted records now take more money with them than before, so the PR body gives the records proof for one played year against main in a drawn place and explains each table that differs.

**Time box.** 3 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted household leaves with its own share of what its group holds, never more than the group holds, and the year never stops on it. Wire to the world: show the departure record and the fund's balance before and after in the Larned seed. No dice. Every shortcut is a registered stopgap.

**Done when.** A second session (not the builder) runs the M0-13 played world in the named place, Larned, Kansas (key 2038700, seed 0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96) and sees it play past 2025-05-01 with household_36ebf1aae0b27cf0's departure recorded and its group's fund at or above zero. It also finds the test with both cases, and in a place drawn by a seed nobody chose it reads one counted departure from a weighted record in dev mode's Trace and checks the cash that left against the group's fund per person times the people who left.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/counted-departure-share.test.ts (new), src/core2/counted-money.ts, src/core2/modules/counted-moves.ts, tests/golden-path/played-world.node-test.ts

**Notes (Fable's check, Nov 10).** The first step is the replay on today's main. If it passes, close this item as fixed and name the change that fixed it. Do not cap the share at the balance to make the throw go away: the share is already a part of that balance, so a throw means the two readings disagree, and that is the thing to find.

**Notes (Fable, Nov 10, how the cause was found).** A temporary print at the failing transfer, removed after the run, gave the record's weight, its members, the group's people and the fund. A second print in `withCountySample` gave the county's inputs in Larned: eligible 3,717, relatives placed there 4,576 (3,817 adults in 2,938 households, all of the light tier), sample adults 241, weight 0.00417. After the opening the county's counts hold 4,577 people with no recorded job, almost all of them those relatives. The relatives are placed by `newHome` in src/core2/opening-kin.ts (line 446), for every household of the town. That root belongs to core-light-opening-kin-only-kept, and the weight below one to world-county-sample-weight-below-one.

**Notes (Fable, Nov 10, reopened).** Pull request 8240 only wrote this item's cause; it built nothing. Its first line named this item, so the merge marked it merged by mistake. It is open again and nothing here is on main yet.
