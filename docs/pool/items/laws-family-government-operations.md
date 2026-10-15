---
id: laws-family-government-operations
title: "Government-operations family: redistricting and the remaining government laws"
area: laws
kind: wiring
priority: 1
size: M
status: blocked
claimed-by:
pr:
blocked-on: gov-redistricting
milestone:
source: "split from laws-remaining-families, Oct 15"
---

**What.** Independent redistricting (`SG-GOV-REACH-A-redistricting`) records a rule on legislators while nobody draws district lines. List every government-operations policy in reach-group-a.json that is still record-only, then give each a read or a stopgap with a reason the CTO accepts; build the redistricting step after a census if the elections engine has districts to draw.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table; knowing is a read.

**Done when.** One dollar or rule followed to a named person and back out in a drawn place (law in force, payment or price or eligibility changed, person reached, view or choice moved, director line), by record id; or the stopgap row keeps a reason the CTO accepts. The owner plays it: the council or state passes the law and within the month a named person's paycheck, price or eligibility changed.

**Files.** src/core2/law-reach/*, src/core2/modules/ (the owning engine), src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-redistricting.

**Oct 15 check.** The only record-only government-operations law left is independent redistricting (broadening local authority is read by `policyAuthority`, PR for `laws-record-only-reads`). Districts are labels on seats (`src/core2/modules/elections.ts`); nobody draws lines. See `gov-redistricting`.
