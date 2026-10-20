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

**What.** The opening's public school district (`withPublicSchoolDistrict`, `src/core2/opening-public-schools.ts`) holds no cash and no link to a government, and its teachers are counted workers, whose wage flow is paid from the payer's own cash only (`settle` in `src/core2/modules/residents.ts`: `Math.min(requested, spendable(core, flow.payerId))`). So no teacher in any town is paid: Moyock Public Schools requested $229,860 over a year and paid $0 (seed sp3). Linking the district to the town's treasury the way the town departments are linked (world-public-employer-staff-never-paid) pays them, but every staff member of a linked employer is kept a full person (`fullPeople`, `src/core2/residents.ts`): about 12 to 58 more full people per town, the people count up 13 percent and a year 18 percent slower in Mount Olive, Arkansas (223 s against 189 s, same machine, one process at a time). Pay the teachers and keep them counted: a counted wage flow whose payer is an employer funded by a treasury is paid from that treasury's account, the payday counts as the line's in-town spending (`notePublicPay`), and `fullPeople` stops keeping a funded employer's staff full unless they are officials or in the player's circle.

**Rules.** One model, two tiers: a counted teacher is paid and taxed by the same rule as a full one, times the count. Every dollar balances and the treasury's close keeps back the wages it funds (`payrollReserve`). No dice. One rule, all 56 places. Speed: no more than 20 percent slower than before, measured one process at a time.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, the school district's counted teachers receive their pay on every payday from the town's treasury (journal record ids named), the number of full people in the town is the same as before the change, and a test beside `src/core2/department-pay.test.ts` states both.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/opening-public-schools.ts, src/core2/budgets-treasury.ts

**Notes.** Found while building world-public-employer-staff-never-paid (Oct 17, claude/public-staff-never-paid). That change leaves the district unlinked on purpose (it strips the copied government link) so the town's people count and year time do not grow. The county's and the state's opening employers have the same shape: their staff are full people only because they carry an authority.
**What.** A town's public school district holds no cash and its full-person staff are never paid. Over the first 120 days of the played world (`buildBenchWorld`, seeds u1 and u3), Raceland, Louisiana's public schools had 3 jobs, opened with $0 and paid $0 in payroll, and Big Rapids, Michigan's had 2 jobs, $0 and $0. A one-person employer called "Neighbors United" in each of three towns drawn (Raceland, Frederica, Delaware and Big Rapids) is the same: one job, $0 opening cash, $0 paid. The budgets engine has a schools line that splits spending 80 percent to workers and 20 percent to contractors (`src/core2/data/budgets/spending-payees.json`), but no transfer reaches the district's own account, so the district has nothing to pay with. Find how the schools line reaches the people who teach, and make the district's account receive its funding from the treasury that carries the line.
**Rules.** Wire to the world: the district's payroll draws on cash a treasury sent it by the schools line, and the same dollar is on the treasury's books. Every dollar balances. One model, two tiers: counted teachers are paid by the same rule as full ones.
**Done when.** In the played world (`buildBenchWorld`, the drawn places Raceland, Louisiana and Big Rapids, Michigan with seeds u1 and u3, and one random place) a public school district with full-person jobs pays its payroll on every payday of 120 days, shown by payroll posting ids, and the treasury's schools line shows the matching transfer; a test in `src/core2/` names the place and seed.
**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/spending-payees.json, src/core2/opening-capital.ts
**Notes.** Measured Oct 17 (claude) with a wrapper on `api.postJournal` summing `work-payroll` postings by organization owner, for organizations with at least one current full-person job. The other states' delegations (`government-outside`, 17 jobs each) are also unpaid, by design for now. The nonprofit case is `world-private-zero-cash-employers-never-pay`.
