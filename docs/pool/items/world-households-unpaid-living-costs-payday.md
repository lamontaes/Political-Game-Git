---
id: world-households-unpaid-living-costs-payday
title: "In a small Kansas town half of the outside living costs go unpaid: households hold no cash on the 1st"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/living-costs-arrears
pr: #4937
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T15:29:54.953Z
---

**What.** In the Kansas town 2066800 the households paid only 48 percent of their outside living costs in the first 3 months. The cost is charged on the 1st from cash on hand, a worker's pay arrives later in the month, and what was unpaid was dropped. Carry it as arrears and ask again each day until paid, as rent is.

**Rules.** Every dollar balances. No dice: the household's cash and pay decide. One model, two tiers: the counted groups keep their own arrears.

**Done when.** In a drawn town (name place and seed), households pay at least 85 percent of the living costs asked over 90 days, and `src/core2/living-costs-arrears.test.ts` states it and the books balance.

**Files.** src/core2/modules/residents.ts

**Notes.** Built on claude/living-costs-arrears. Over 90 days from the start: Odessa, Delaware (seed a4) 76 to 94 percent, Tenakee Springs, Alaska (a3) 84 to 93, Groton, Massachusetts (a5) 87 to 92. `scripts/core2-year/living-costs-paid.ts` prints it for any seed. A full household's flow now carries its unpaid part in `arrearsMinor` and is due again each day until the next bill; the totals count what was newly asked, not the carried part twice. Left as is: only the first payer's cash is used; the household's other members' cash is not (a household whose payer holds nothing while another member holds thousands still pays nothing), which would be a separate item. `counted-weight-money.test.ts` fails the same way on main in Bristol, Vermont (seed 227e38abab0591dfdf8ef23df917ea41c3f940e95bc4e22ed5cb6ce937710659): a counted payroll flow asked for 6,807,498 against 6,543,746, the twice-monthly payroll sibling bug fixed in #4928, so it is not this change.
