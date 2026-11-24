---
id: dev-mode-wage-floor-reach-is-one-days-pay
title: "A minimum wage raise's reach shows one day's added pay: a raise that cut 105 jobs reads $48,000"
area: laws
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Dev mode's reach for a minimum wage or public pay floor law gives a dollar figure that is one day's added pay, not the pay the law added. A 40% raise at West Union, Ohio ($10.70 to $14.98) shows $1,877 while store wages rose 12% and the fitness center's 30% on the books; at Mammoth Lakes, California the raise cut 105 restaurant jobs and shows $48,000. The public pay floor reads the same way: $45,000 reached 4 people for $60. Seen: dev mode's bill card and law page reach for a wage law.

**Cause.** Found in code: `recordWageReach` in src/core2/wage-floor.ts (line 111) stores the daily pay the raise adds as amountMinor, and `lawReach` in src/core2/law-reach/applied.ts adds it to the whole payments other engines store, mixing units in one total. Measured: West Union, Ohio (3984294), seed ilt-west-union, 365 days (stores-health-services.md finding 6).

**Fix.** `recordWageReach` in src/core2/wage-floor.ts records the pay the raise added on each pay day it reads (the added rate times the hours paid), under the same law id, so `lawReach` sums dollars actually paid like every other engine's rows. The bill card's What this did shows the year's added pay.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, raises the state minimum wage by three dollars, advances a month and opens the bill card: its dollar figure matches the added pay on the reached workers' pay records for that month, named by record id, within a cent per worker.

**Waits on.** Nothing.

**Files.** src/core2/wage-floor.ts, src/core2/law-reach/applied.ts, src/core2/wage-floor.test.ts (new)
