---
id: core-world-stops-on-income-term-without-its-award
title: "A played world stops on September 1 of year 1 when an income term cannot find its current award"
area: core
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: R1 (Fable A's builder)
pr: #8882
after:
blocked-on:
lead: core
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-12T13:00:56.417Z
---

**What.** Seen: the game stops. A world that throws cannot be played (CTO, Nov 12, #7365 comment 6822123666). In South Ogden, Utah (place 4970960), seed 7a605c17-6fe1-465b-b397-caf285473399, the played world reaches 2025-09-01 and throws "Actual income term does not resolve its current qualified award." from src/core2/finance-cash.ts line 313, reached through contractAuthority and settleDueFinance. Found by Merger codex-4629 while gating #8375 (#7365 comment 6822115296): src/core2/drives-filled-in-job-loss.test.ts, test line 138, fails the same way on clean main 3ed3915c59 with NODE_OPTIONS unset and GOLDEN_PATH_SEED=7a605c17-6fe1-465b-b397-caf285473399. The other failure in that file (Steamboat Springs, Colorado) is tests-drives-filled-in-job-loss-no-counted-loss, not this item. Seen: the world keeps playing past September 1 of the first year

**Cause.** Measured: South Ogden, Utah (place 4970960), seed 7a605c17-6fe1-465b-b397-caf285473399, a probe at the throw in src/core2/finance-cash.ts `incomeAward` on 2025-09-01. The term is opening-retirement-income:ae2ff1c6f5e63211 (kind income.retirement, $1,575.05 a month), paid to person_5c604a79d8964757 on award opening-retirement-award:66e7f40e20b1d13d (in-payment, payer opening-retirement-payer:4f8366dd509edbff). The award, the rule and the contract terms all held; the one failed condition was the person's household: the term names household_33f7d92eb827d5d4, but the person lived in household_33f7d92eb827d5d4:parted:person_5c604a79d8964757:2025-09-01, a home made that day. Found in code: the couple parted in src/core2/modules/partnerships.ts (`partInTown` through `changeHouseholdV1`, and `part` through `relocatePeopleV1`, both name the new home `<old>:parted:<person>:<date>`). The household writers in src/core2/state.ts (`relocatePeopleV1`, `changeHouseholdV1`) moved the person, the spending and the home's payers, but not the person's income award. Only src/core2/modules/moves.ts called `moveRecipientIncomeHome` after it relocated someone, so every other caller (parting, the homeless engine, counted demotion) left the term on the old household, and the next due date threw.

**Fix.** Built: `relocatePeopleV1` and `changeHouseholdV1` in src/core2/state.ts call `moveRecipientIncomeHome` (src/core2/finance-state.ts) for each person they move, so the award is paid into the home the person lives in from its next due date, the amount unchanged and the saved award still naming the household it was written for. The separate call in src/core2/modules/moves.ts is removed (the writer now does it). No new payment path.

**Time box.** 1 hour

**Rules.** One rule, all 56 places. No dice. One money system: the fix changes the function that already owns the award or the term, never a second payment path. Never catch and ignore the throw.

**Done when.** A second session runs GOLDEN_PATH_SEED=7a605c17-6fe1-465b-b397-caf285473399 npx vitest run src/core2/drives-filled-in-job-loss.test.ts and sees the South Ogden world play past 2025-09-01, and plays two more drawn places through September 1 of year 1 with no throw, with the Notes naming the term and the award by record id.

**Waits on.** Nothing

**Files.** src/core2/state.ts, src/core2/types.ts, src/core2/modules/moves.ts, src/core2/income-award-follows-person.test.ts, src/core2/drives-filled-in-job-loss.test.ts

**Notes (Nov 12, R1).** Probed at the throw on main e298200245 with the item's seed: the failing condition was `person.householdId !== term.householdId`, for the term and records named in Cause. The fix and a drawn-place test (src/core2/income-award-follows-person.test.ts, "changes household in town") are on branch claude/pool-core-world-stops-on-income-term-without-its-award. The file's older test was red by draw on clean main (Saline, Louisiana, seed 2289e1793fbe0c369879edd016070425: the whole household moved, so no shared home was left); it now names that case as passed over and tries the next retiree.
