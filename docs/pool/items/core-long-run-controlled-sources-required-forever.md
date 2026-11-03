---
id: core-long-run-controlled-sources-required-forever
title: "A controlled person's payroll and cash-act sources are never released, so the cash journal keeps every one of the player's paydays"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: speed
source: speed lead's round-four reader check and the review of speed/fold-cash-receipts, Nov 2
---

**What.** prunePriorSource (src/core2/work-cash.ts:584-603) returns early for a source in retainedControlledSources, and the payroll path (src/core2/work-payroll-cash.ts:1916, :2212, :2383) never releases a controlled source at all, so every payroll and cash-act source paid to the person under explicit control (the player on the player clock, or anyone dev mode controls) stays required. Each such receipt keeps `retention.requiredBySource`, core.cashJournal.requiredBySource gains a row every payday, and the monthly fold of itemized receipts (foldOldCashJournalDetail in src/core2/decision-detail.ts) must keep them all and walks them again on every 1st. speed:year cannot show it, because advanceCore refuses to run while a person is controlled (src/core2/life.ts:605). In dev mode, dropOldPayrollSources (src/core2/decision-detail.ts:292-311) also deletes a controlled non-player's payroll source rows after 7 days while requiredBySource still names them, so those receipts can never be released.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 hold at most 1.2 times the records of years 1 to 4, so a table that gains a row every payday of play must stop growing. The CTO ruling of Nov 1, 21:25 keeps open obligations whole, so the fix releases a controlled source once the next one for the same commitment posts (as prunePriorSource already does for every other source); it never folds a receipt that is still required.

**Done when.** In a drawn place, a test that plays the player on the player clock for 120 days shows at most one required journal receipt per payroll or cash-act commitment of the player after the second payday, the released receipts fold on the first 1st past cashJournalDetailDays, and the work-cash, work-payroll-cash and player-control tests pass in drawn places named with their seeds.

**Files.** src/core2/work-cash.ts, src/core2/work-payroll-cash.ts, src/core2/decision-detail.ts

**Notes.** lead: speed (work and payroll have no lead of their own in CREW.md). Found by the round-four reader check (correction 2) and confirmed by the review of speed/fold-cash-receipts (e017d21aab).
