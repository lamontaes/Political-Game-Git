---
id: laws-remaining-families
title: "Wire the remaining law families to the engines that pay or decide"
area: laws
kind: wiring
priority: 3
size: L
status: dropped
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

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into laws-wiring-every-law. This Oct 15 umbrella split into seven children, and on main laws-family-bargaining, laws-family-cannabis, laws-family-clean-air, laws-family-government-operations, laws-family-health-programs and laws-family-school-vouchers are `done`; only laws-family-justice is `open`, and laws-nine-links-justice carries the same work. The nine-link family items and laws-wiring-every-law now hold the same roll-up. The kept item takes nothing more. Stale paths: src/core2/data/stopgaps.json is now src/core2/data/stopgaps/gov.json, and "src/core2/law-reach/_" and "src/core2/data/laws/_.json" are mangled globs for src/core2/law-reach/_.ts and src/core2/data/laws/_.json.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `laws-wiring-every-law`, which carries this item's remaining work.
