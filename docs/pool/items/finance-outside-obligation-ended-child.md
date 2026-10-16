---
id: finance-outside-obligation-ended-child
title: "Finance day throws 'Outside obligation refers to missing, inactive or unmatched recipient terms' on a pooled retirement obligation in a world with convictions"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/outside-obligation-ended-child
pr: #4734
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T14:05:24.318Z
---

**What.** In one drawn world the finance day (`runFinanceDay`, then `settleFinanceContract`) threw in `contractAuthority` (src/core2/finance-cash.ts near line 1697): a pooled retirement obligation lists income contracts whose child record has ended, has a different due date or period, or does not name the obligation's payee as a payer. The world stops the day it throws. Find which child record fell out of step with its pooled parent and keep them together when a child ends.

**Rules.** Ask why (name the parent and child contract ids); the chain is the acceptance; no dice.

**Done when.** The cause is named by contract id; a test in src/core2 builds the case (a retiree's award ends while its pooled obligation stands) and settles a month without throwing; a 240-day run in a drawn place no longer stops on it.

**Files.** src/core2/finance-cash.ts, src/core2/finance-state.ts, src/core2/modules/residents.ts

**Notes.** Found by the prison-voting test (pool item gov-needs-opus-gov-209) while 40 sitting officials were offered large bribes and the justice engine sentenced several. It stopped one world in six or so on the first run, 37 seconds in, and not on two later runs; the seed was not kept. Whether the convictions matter is not shown: a sentenced person's jobs end, and a retirement child could end the same way. The test now skips a world that stops on it and names its seed in the failure message if no world gets through.
