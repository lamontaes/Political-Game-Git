---
id: world-public-school-staff-never-paid
title: "A town's public school teachers are never paid: the district holds no cash and counted teachers are paid from the payer's cash only"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The opening's public school district (`withPublicSchoolDistrict`, `src/core2/opening-public-schools.ts`) holds no cash and no link to a government, and its teachers are counted workers, whose wage flow is paid from the payer's own cash only (`settle` in `src/core2/modules/residents.ts`: `Math.min(requested, spendable(core, flow.payerId))`). So no teacher in any town is paid: Moyock Public Schools requested $229,860 over a year and paid $0 (seed sp3). Linking the district to the town's treasury the way the town departments are linked (world-public-employer-staff-never-paid) pays them, but every staff member of a linked employer is kept a full person (`fullPeople`, `src/core2/residents.ts`): about 12 to 58 more full people per town, the people count up 13 percent and a year 18 percent slower in Mount Olive, Arkansas (223 s against 189 s, same machine, one process at a time). Pay the teachers and keep them counted: a counted wage flow whose payer is an employer funded by a treasury is paid from that treasury's account, the payday counts as the line's in-town spending (`notePublicPay`), and `fullPeople` stops keeping a funded employer's staff full unless they are officials or in the player's circle.

**Rules.** One model, two tiers: a counted teacher is paid and taxed by the same rule as a full one, times the count. Every dollar balances and the treasury's close keeps back the wages it funds (`payrollReserve`). No dice. One rule, all 56 places. Speed: no more than 20 percent slower than before, measured one process at a time.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, the school district's counted teachers receive their pay on every payday from the town's treasury (journal record ids named), the number of full people in the town is the same as before the change, and a test beside `src/core2/department-pay.test.ts` states both.

**Files.** src/core2/modules/residents.ts, src/core2/residents.ts, src/core2/opening-public-schools.ts, src/core2/budgets-treasury.ts

**Notes.** Found while building world-public-employer-staff-never-paid (Oct 17, claude/public-staff-never-paid). That change leaves the district unlinked on purpose (it strips the copied government link) so the town's people count and year time do not grow. The county's and the state's opening employers have the same shape: their staff are full people only because they carry an authority.
