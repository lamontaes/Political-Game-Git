---
id: laws-family-bargaining
title: "Collective bargaining and agency fees: a union contract sets public pay; right-to-work ends dues"
area: laws
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/laws-family-bargaining-012x
pr: "#4434"
blocked-on:
milestone:
source: "split from laws-remaining-families, Oct 15"
---

**What.** Public-sector bargaining is recorded on workers, employers and the union (`SG-GOV-REACH-A-bargaining`) but no contract is bargained and no pay changes; right-to-work records a rule on a union that has no dues (`SG-GOV-REACH-A-union-dues`). Build the smallest read: union membership on jobs, a contract that sets a bargaining unit's pay through the existing job rerate, dues as a payroll deduction through the journal, and right-to-work ending the deduction for nonmembers.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table; knowing is a read.

**Done when.** One dollar or rule followed to a named person and back out in a drawn place (law in force, payment or price or eligibility changed, person reached, view or choice moved, director line), by record id; or the stopgap row keeps a reason the CTO accepts. The owner plays it: the council or state passes the law and within the month a named person's paycheck, price or eligibility changed.

**Files.** src/core2/law-reach/*, src/core2/modules/ (the owning engine), src/core2/data/stopgaps.json

**Notes.** SG-GOV-REACH-A-bargaining, SG-GOV-REACH-A-union-dues.

**Progress (Oct 15).** Built: right-to-work lowers the local union's dues as membership falls (`group-a-union.ts`). Not built, split out: public-sector bargaining (`gov-public-sector-bargaining`). `SG-GOV-REACH-A-union-dues` is narrowed and stays open; `SG-GOV-REACH-A-bargaining` stays open.
