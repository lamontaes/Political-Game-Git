---
id: laws-remaining-families
title: "Wire the remaining law families to the engines that pay or decide"
area: laws
kind: wiring
priority: 1
size: L
status: open
claimed-by:
pr: "#4404"
blocked-on:
after: laws-family-justice
milestone:
source: "reissue-2026-10-15 item 1 (Session A)"
---

**What.** Merged: housing #4331, prices #4335, law knowledge #4342, property tax #4345, groundwater #4359, consumer credit #4361, income tax #4365. Still to wire: collective bargaining and agency fees; cannabis sales; health and assistance programs; school eligibility; clean air; the justice family; the government-operations family. One PR per family.

**Rules.** No dice; an effect is a read; the chain is the acceptance; one rule, all 56 places; numbers in the parameter table; knowing is a read.

**Done when.** Each family: one dollar or rule followed to a named person and back out (law in force, payment or price changed, person reached, view or choice moved, director line), by record id, in a drawn place. Owner plays it: the council passes a law and within the month a named person's paycheck, rent, price or eligibility changed and they cite where they heard.

**Files.** src/core2/modules/laws.ts, budgets.ts, src/core2/law-reach/_, src/core2/data/laws/_.json, src/core2/data/stopgaps.json

**Notes.** Overnight Session A stopped when usage ran out. The assistance-work-requirement and highway-shift failures in law-reach-group-b.test.ts belong here (see bug item).

**Split (Oct 15, claude/laws-remaining-families).** Seven bounded items, one per family: laws-family-health-programs, laws-family-school-vouchers, laws-family-cannabis, laws-family-clean-air, laws-family-bargaining, laws-family-justice, laws-family-government-operations. This item is done when all are.

Oct 20: Switched from blocked to the automatic after: gate on laws-family-justice, so it opens by itself the moment those items are done.
