---
id: world-counted-household-arrears-take-whole-paycheck
title: "Filled-in households owe their living costs as daily arrears, so the whole paycheck leaves the day it lands and the worker ends with no cash (St. Johnsbury 7 of 42)"
area: world
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
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** M0-13's 'pay reaches a spendable account' read 7 of 42 people paid in the last month with no cash at the end in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4). One was a legitimate departure (person_1f0bfb6557f8ebe2 moved away on 2026-01-16). The other six were filled-in counted households whose pay was swept the day it landed by residents:outside-living (for example person_4470e4e4584d4139 was paid 17,941 on 2026-01-12 and residents:outside-living:household_47910ceefee0e58a took 16,569 the same day). The suspected flow is the carried living cost in src/core2/modules/residents.ts (lines 1099-1102: a household's unpaid living cost is carried as arrears and asked again every day, requested = base + arrearsMinor), so each wage is swept by the arrears the day it arrives. On Oct 28 the same seed and place ran ALIVE on main ("609 paychecks reached their workers"), so the first job is to rerun the check and say whether this is already closed.

**Cause.** Needs cause. Looked at the item's Notes (the Oct 28 rerun with GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 reported ALIVE) and the carry code at src/core2/modules/residents.ts lines 1099-1102; whether it still fails on today's main, and how outsideLiving is sized for a filled-in household, is not established.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session, to rerun the replay on main and write what it shows in the item. When it runs out, write what was seen and stop.

**Rules.** Wire to the world: a household's spending follows its income and records, so a household whose costs outrun its pay is a sizing error in the fill-in, not a feature. One model, two tiers: a filled-in household behaves as its counted weight did, with the same cost and income. Ask why: the sizing of the household's living cost against the group's income is traced by record id before any number moves. Estimate, never UNKNOWN: its cash is an estimate from the group's records, not zero.

**Done when.** A second session (not the builder) reruns `GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` on main in the named place, St. Johnsbury, Vermont and writes the result into this item. If 'pay reaches a spendable account' is ALIVE, the CTO drops the item as done by main; if it fails, the cause is named by the household's living-cost flow id and its sizing line and the item is rewritten with that cause.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/counted-groups.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper, from the cash-journal trail of the seven people (probe run, not committed). Not yet traced: how outsideLiving.amount (residents.ts:1856) is sized for a filled-in household versus the group's column, and whether the arrears were already in the group's books at fill-in. The test's brokeWorkers read (played-world.node-test.ts:793) counts a person who moved out of the town; whether to skip departed people is the spec owner's call.
Oct 28 (claude pool worker): not reproduced on main. `GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx --test-reporter=spec tests/golden-path/played-world.node-test.ts` (St. Johnsbury, Vermont) reports "ALIVE pay reaches a spendable account: 609 paychecks reached their workers". Something merged since the item was filed (the arrears sweep or the fill-in living cost) closed it, or the check's list of people differs now. Left open for the CTO or a merger to close as done-by-main.
Nov 10 (Fable): not reproduced again. The same command with the same seed and place on main cb25bfa5c8 reported "ALIVE pay reaches a spendable account: 90 paychecks reached their workers". That is twice on main, twelve days apart. By this item's own Done when, it is the CTO's to drop as done by main.
