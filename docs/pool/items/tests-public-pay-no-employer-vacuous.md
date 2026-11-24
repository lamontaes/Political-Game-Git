---
id: tests-public-pay-no-employer-vacuous
title: "The public-pay test can pass without checking any public employer"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/public-pay-nonvacuous
pr: #6341
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
claimed-at: 2026-10-27T15:46:02.022Z
---

**What.** src/core2/budgets-public-pay.test.ts:34-38 returns before any assertion when the opening has no publicPayAuthority employer. Merger 2 observed this in Alega, American Samoa, with GOLDEN_PATH_SEED=f3d402dc6d11da2e while checking PR #5998: the case printed no opening public employer and passed without testing a payday or treasury link. A genuinely empty input can be valid, but that passing case supplies no positive payroll evidence and can hide an opening-producer regression.

**Rules.** Never weaken a test: retain the exact equality of payroll-ledger payments and treasury draws plus recorded shortfalls, and require nonempty positive coverage. One rule, all 56 places: any bounded search for an applicable world uses opening employer and commitment facts before play, never missing output after play. Wire to the world: a positive payroll assertion names an actual worker commitment and its journal entry or recorded shortfall.

**Done when.** src/core2/budgets-public-pay.test.ts cannot succeed without assertions. A drawn buildBenchWorld case with place and full seed named proves a nonempty public employer and a positive payday or recorded shortfall reconciled exactly with the payroll ledger by record id. A no-employer case asserts its negative input explicitly and does not replace the required positive case. Disabling the treasury payment producer fails an eligible case instead of selecting another world or returning early. Keep a known regression beside the fresh drawn case.

**Files.** src/core2/budgets-public-pay.test.ts

**Notes.** Found during PR #5998 review at checked head 9fdf58914c0ee58255a02f694be25b068fc514e6; this early return already exists on main and is unchanged by that PR. The separate old money-reconciliation issue tests-budgets-public-pay-intermittent is done via #5995 and is not reopened. Additional positive check at Marlborough NH, root109a7b3b1d5c1715d738e7b8ca9deec614910239, world873e6371b7ae7444c76151367a8c6876172f2e41ab9bbe2c9a0999ec5d6837ee: 9 authorities, 61 payday entries, treasury11512962 cents plus shortfalls639884 cents reconciled with the ledger; test passed54.379s. Do not treat Alega's empty pass as positive coverage.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/budgets-public-pay.test.ts
