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
