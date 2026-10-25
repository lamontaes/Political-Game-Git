---
id: world-counted-household-arrears-take-whole-paycheck
title: "Filled-in households owe their living costs as daily arrears, so the whole paycheck leaves the day it lands and the worker ends with no cash (St. Johnsbury 7 of 42)"
area: world
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M0-13's 'pay reaches a spendable account' reads 7 of 42 people paid in the last month with no cash at the end in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4); the other two drawn places pass it. The pay does reach them (0 of 665 paychecks failed to raise cash). One is a legitimate departure: person_1f0bfb6557f8ebe2 moved away on 2026-01-16 and mover-departure took 759,852 minor units. The other six are filled-in counted households: for example person_4470e4e4584d4139 was paid 17,941 on 2026-01-12, 1,372 was withheld, and residents:outside-living:household_47910ceefee0e58a took 16,569 the same day; person_5e422385823e7a3d was paid 50,160 on 2025-12-11, 4,567 withheld, and residents:outside-living:household_35c3b0eef4a8dea6 took 45,593 that day and again on 2025-12-25; person_a0a4eb96a5ecacdb was paid 31,830 on 2026-01-05 after a 61,986 outside-living and a 61,989 mortgage payment on 2026-01-01. Cause located to the flow, not yet to its sizing: src/core2/modules/residents.ts:968-980 carries a household's unpaid living cost as arrears and asks again every day (requested = base + arrearsMinor), so each wage is swept by the household's arrears the day it arrives; the household's living cost is larger than its income, so the arrears never clear and it holds no cash.

**Rules.** Wire to the world: a household's spending follows its income and records, so a household whose costs outrun its pay is a sizing error in the fill-in, not a feature. One model, two tiers: a filled-in household must behave as its counted weight did, with the same cost and income. Ask why: the sizing of the household's living cost against the group's income is traced by record id before any number moves. Estimate, never UNKNOWN: its cash is an estimate from the group's records, not zero.

**Done when.** In buildBenchWorld in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4), M0-13 pay reaches a spendable account is alive: the cause is named by the household's living-cost flow id and its sizing line, filled-in households in the run keep their cash above zero after payday in proportion to their income, and two more drawn places show the same check alive or unobserved with their seeds named. The departed mover is explained by record id in the PR (a person who left the town has no cash here), with the spec question flagged.

**Files.** src/core2/modules/residents.ts, src/core2/counted-groups.ts, tests/golden-path/played-world.node-test.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper, from the cash-journal trail of the seven people (probe run, not committed). Not yet traced: how outsideLiving.amount (residents.ts:1856) is sized for a filled-in household versus the group's column, and whether the arrears were already in the group's books at fill-in. The test's brokeWorkers read (played-world.node-test.ts:793) counts a person who moved out of the town; whether to skip departed people is the spec owner's call.
