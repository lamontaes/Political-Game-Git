---
id: world-public-school-staff-never-paid
title: "A town's public school teachers are never paid: the district holds no cash and counted teachers are paid from the payer's cash only"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/school-staff-pay
pr: #5044
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:47:04.661Z
---

**What.** A town's public school district holds no cash and its full-person staff are never paid. Over the first 120 days of the played world (`buildBenchWorld`, seeds u1 and u3), Raceland, Louisiana's public schools had 3 jobs, opened with $0 and paid $0 in payroll, and Big Rapids, Michigan's had 2 jobs, $0 and $0. A one-person employer called "Neighbors United" in each of three towns drawn (Raceland, Frederica, Delaware and Big Rapids) is the same: one job, $0 opening cash, $0 paid. The budgets engine has a schools line that splits spending 80 percent to workers and 20 percent to contractors (`src/core2/data/budgets/spending-payees.json`), but no transfer reaches the district's own account, so the district has nothing to pay with. Find how the schools line reaches the people who teach, and make the district's account receive its funding from the treasury that carries the line.

**Rules.** Wire to the world: the district's payroll draws on cash a treasury sent it by the schools line, and the same dollar is on the treasury's books. Every dollar balances. One model, two tiers: counted teachers are paid by the same rule as full ones.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Raceland, Louisiana and Big Rapids, Michigan with seeds u1 and u3, and one random place) a public school district with full-person jobs pays its payroll on every payday of 120 days, shown by payroll posting ids, and the treasury's schools line shows the matching transfer; a test in `src/core2/` names the place and seed.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/spending-payees.json, src/core2/opening-capital.ts

**Notes.** Measured Oct 17 (claude) with a wrapper on `api.postJournal` summing `work-payroll` postings by organization owner, for organizations with at least one current full-person job. The other states' delegations (`government-outside`, 17 jobs each) are also unpaid, by design for now. The nonprofit case is `world-private-zero-cash-employers-never-pay`.
