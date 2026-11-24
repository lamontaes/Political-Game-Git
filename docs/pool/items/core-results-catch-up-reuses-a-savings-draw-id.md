---
id: core-results-catch-up-reuses-a-savings-draw-id
title: "Results mode stops on a reused transfer id: an employer short on two paydays of one skipped month draws its savings twice under one id (Escalon, California)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/savings-draw-id-per-due-date
pr: 8903
after:
blocked-on:
lead: speed
model: sonnet
effort: low
root: none
source: Opus fixer for Fable A, Nov 12, 2026, tracing #8886's send-back (Merger codex-4629, comment 6829333065)
---

**What.** In results mode the residents engine catches up on the first of each month and pays every flow that fell due on the skipped days, each with its own due date, all on that one day. When an employer is short of cash on two of those paydays and holds savings at a local bank, the second savings draw reuses the first one's transfer id and the run stops: "Transfer id is empty or reused: savings-for-payment:residents:wages:opening-payroll-calendar:organization_0a17a370373c6d17|residents:jurisdiction_6d42f36abd59430b@2026-04-01:organization:bank:jurisdiction_6d42f36abd59430b". Seen: a skipped month in the long game (results mode) stops with an error instead of finishing, so the player never reaches the next month.

**Cause.** Found in code: src/core2/modules/residents.ts, `spendableFromSavings` (line 837 on main 33e38d44bc) names the draw `savings-for-payment:${flowId}@${core.date}`, the day the catch-up runs. `runResidentsDay` (line 1608) settles each skipped due date in turn through `settleDue` (line 1621) while `core.date` stays the first of the month, and `settle`'s own payment is already named by the due date (`${flow.id}@${date}`). So a weekly or biweekly wage flow settled two to five times in one catch-up asks for the same savings id each time it is short. Measured in Escalon, California (place 0622790), drawn from GOLDEN_PATH_SEED e24e25a7-6895-424e-a65d-ea8567e62726 by src/core2/unplaced-workers-unit.test.ts, world seed debb244d6d0d814a60610091708b1e965cb742f8dc9c279b9269373d20675afd: 400 played days to 2026-02-24, then results mode. On 2026-04-01 the weekly flow above is settled for 03-02, 03-09, 03-16, 03-23 and 03-30; on #8886's head 9e9c8eb69c the employer is short on 03-16 (cash 0 of 274,135 minor) and 03-23 (237,697 of 274,135), and the second draw throws. On clean main 33e38d44bc, the same world with a probe that asserts nothing asks for one id twice on 2026-04-01 as well (`residents:wages:organization_e6f1bfb0ee36f1f3:2025-09-01@2026-04-01`, cash 0 both times); it does not throw there only because that employer holds no deposits, so `drawSavingsToCover` (src/core2/accounts.ts) returns before any transfer. The wage flow's credit draw is keyed the same way (`wageFlowDrawRequestPrefix` with `session.date`, src/core2/finance-cash.ts, `transferWageFlowCredit`), so the fix checks it too.

**Fix.** Pass the due date `settle` already has (`date`) into `spendableWithCredit` and `spendableFromSavings`, and name the savings draw `savings-for-payment:${flowId}@${due}`. In play the due date is today, so nothing changes there. Do the same for the wage flow's credit draw if its trigger id repeats in one catch-up. One id scheme, still deterministic; no second payment path.

**Time box.** 1 hour

**Rules.** Every dollar balances: never swallow the transfer error or skip the draw. The id stays deterministic from the flow and its due date. No dice; no place named in code.

**Done when.** A second session runs `GOLDEN_PATH_SEED=e24e25a7-6895-424e-a65d-ea8567e62726 npx vitest run src/core2/unplaced-workers-unit.test.ts --maxWorkers=1` on main, once the per-household unit for out-of-town workers has merged (the item world-regional-work-piles-unplaced-workers-on-a-household; before that, on its branch), and sees the run pass the 2026-04-01 catch-up in Escalon, California, then runs two more drawn places through 400 played days and 60 results-mode days with no reused transfer id, naming each place and seed.

**Waits on.** Nothing

**Files.** src/core2/modules/residents.ts, src/core2/accounts.ts, src/core2/finance-cash.ts, src/core2/results-mode-savings-draw-per-payday.test.ts (new)

**Notes.** Found while tracing #8886's third send-back; the trace is on that pull request. The crash is main's id scheme; #8886's changes to the out-of-town workers move which employer is short on which payday in that world, not how the draw is named.
