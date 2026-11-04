---
id: housing-mortgage-balance-grows-while-paid
title: "A paid-up mortgage's balance grows from October on"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: lane-2/mortgage-paid-balance
pr:
blocked-on:
lead: laws
milestone: play-first
source: realistic-not-real audit, Oct 27 (found running src/core2/macro-mortgage-history.test.ts)
claimed-at: 2026-11-04T11:23:53.483Z
---

**What.** In Echo, Utah (4921880), seed 2d3cadf85fab3908af3e4cdbe95e98d5a45108549587024e8f762e4ba336c335, mortgage:household_1a9aa8aaf58cac35 (2.95%, payment 421,725 cents, missed months 0) falls from 91,806,022 to 91,717,457 cents by July 2025, then rises to 91,935,300 by January 2026 on clean main. A loan with no missed payment should only fall. The test src/core2/macro-mortgage-history.test.ts draws a random place each run, so it fails on main whenever it draws a loan like this one.

**Rules.** Ask why: the balance change each month is traced to the engine that wrote it, by record id, before any fix. Wire to the world: the fix holds for every mortgage in every one of the 56 places, not the one loan named here.

**Done when.** In the played world named above (buildBenchWorld, the place and seed above), the named loan's balance falls every month it is paid, a test beside src/core2/modules/housing.ts asserts it on a drawn place and seed, and the macro mortgage history test passes on five drawn places.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/modules/housing.ts, src/core2/modules/residents.ts (existing flow receipt metadata), src/core2/housing.test.ts, src/core2/housing-paid-mortgage.test.ts; unchanged src/core2/macro-mortgage-history.test.ts.

**Notes.** Same balances on clean main and with the per-world macro change; not caused by it.

Nov4 Lane2: claimed on lane-2/mortgage-paid-balance. Echo original trace confirms paid group mortgages receive the all-town payment fraction; the named loan grows in two monthly observations while its group pays372650c in full. February6 original regression fails expected30635721 vs30637072 for another paid Echo mortgage. Narrow replacement reads the existing own-group housingMonth receipt; source checks and serial base/head proof are underway. No finance writer or state.ts changes.

Nov4 Built unit on 9a6b9f7feb: fixed Echo year, same drawn Mountain City regression, five unchanged history tests, three negative counterchecks, typecheck/lint/format, fresh Dededo New Game and La Pica four-year comparison pass (maximum +8.33%; both base/head exceed 120s in year 4). Proof: docs/lanes/proof/paid-mortgage-balance.md. Independent review pending; no whole path confirmed.
