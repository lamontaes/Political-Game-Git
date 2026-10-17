---
id: world-press-outlet-revenue-wage-gap
title: "An outlet's standing revenue falls behind its payroll within a year and the station closes (Fort Defiance, Arizona: sales 91 percent of wages by July)"
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

**What.** After the working-capital buffer, one outlet still closed in a year: the station at Fort Defiance, Arizona (draw of seed `pq4` for "pclose") on 2025-07-20, cause `finance.unfunded-obligation-cash-and-credit-exhausted`, one worker laid off. Its books hold payroll $57,491 a year and revenue capacity $62,090 (8 percent margin); to July 20 its sales were $30,259 against wages $33,134, so sales ran 91 percent of wages. Wages rose about 14 percent in half a year while the outlet's standing outside-sales payment, set at the opening, follows only prices and demand (`scaleOutsideSales`, `src/core2/residents-economy.ts`). Find why the outlet's wage bill moves more than its revenue (the re-rate of its reporter's pay, the minimum-wage law, or the price factor) and tie the outlet's revenue to the cost of its town staff as the opening rule does (`max(audience revenue, payroll times one plus the margin)` in `src/core2/modules/press.ts`).

**Rules.** No dice; every dollar balances; one rule, all 56 places; the replacement of `SG-PEOPLE-press-outlet-revenue` is business advertising and subscriptions, so keep the stand-in small.

**Done when.** In a year of the played world in the place above and two drawn places and seeds the builder did not choose, no local outlet closes for lack of cash while its audience revenue and its staff cost stand where the opening put them, shown by closure and book record ids.

**Files.** src/core2/modules/press.ts, src/core2/press-money.ts, src/core2/residents-economy.ts

**Notes.** Found while fixing `world-press-outlets-close-first-weeks`.

**More evidence (Oct 17, claude).** With the cash buffer in place the golden-path check in Pony, Montana (seed `pcA1`) still stops at step 9: the newspaper closed on 2025-06-30 (sales $61,287, wages paid $70,336 by the books) and two of the three stations closed on 2026-06-29 and 2026-10-19, so the town's one remaining reporter could not print the county's fare-free-transit law that took effect on 2026-12-31. The newspaper's book holds payroll $132,517 a year; prorated to the 161 days, that is $58,500, yet `wagesPaidMinor` reads $70,336 (1.20 of it) while one of the other outlets reads 0.60 and ordinary businesses read about 1.00. In Gothenburg, Nebraska (seed `pq3`, "pclose") the same newspaper paid $23,836 against an expected $32,675 in 90 days. So outlets' wage payments swing by about plus or minus 20 percent around their payroll, and with an 8 percent margin and no further cash that closes them. Find where the swing comes from (pay arrears paid in a lump, the pay period against the monthly sales, or the public-pay path the press jobs use, `job:public:press:...`) before tuning the margin or the buffer.

Daily journal of the Gothenburg newspaper (seed `pq3`, "pclose", Jan 21 to Apr 5, 2025): sales arrive as a steady $3,257 to $3,270 a week, and paydays go out twice a month at $5,408 and $6,008 in February but $2,947 and $2,875 in March, about half. A payday that halves in a month points to a worker who did not come to work (the attendance choice is decided on traits when a person's needs are all zero; see `world-staff-aides-never-attend-or-get-fired`), not to a change of pay. So part of the swing is absence, and the outlets' margin is sized on full attendance.
