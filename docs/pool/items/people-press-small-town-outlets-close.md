---
id: people-press-small-town-outlets-close
title: "A small town opens with five local outlets and all five lose their reporters within two years, so no one prints its news"
area: people
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/press-opening-cash
pr: #4999
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T23:40:04.916Z
---

**What.** A town of 1,774 people (Cobb Island, Maryland, place 2418200, seed all56, `buildBenchWorld`) opens with one local newspaper and four local television stations, each with an owner, a head and a reporter. Advancing the world in 120-day steps, the newspaper and one station closed on March 24, 2025 (staff rows show `leftBecause: closure`, the head and reporter both leaving that day), a second and third followed by May 2026, and by September 2026 none of the five local outlets has a reporter. Midway, Louisiana (2250395, same seed) ends the same way: four stations, none with a reporter by March 2028. With no reporter, `runDesk` returns nothing (`!outlet.reporterIds.length`, `src/core2/press-desk.ts`), so a law that took effect in town is printed by no outlet and the golden path stops at step 9 in both places (28 other places that enacted a bill reached step 10). Find why the outlets are sized to open five outlets in a town this small, why they close (the outlet's revenue is a standing payment sized from its audience, `gov-press-outlet-revenue`, against its payroll), and why a closed outlet stays on the list of outlets with no reporters instead of leaving it.

**Rules.** Sliding scales and causes: an outlet closes from its books, not a chance; the number of outlets a town opens with follows the real counts per resident, with the spread marked. One rule, all 56 places: nothing names a place. An effect is a read, not a record: a closed outlet is read as closed by the desk, the audience count and the screens.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Cobb Island and Midway with seed all56, and a random place a builder draws), a town's local outlets that remain open each keep a reporter through two years, a closed outlet is marked closed and not listed as covering the town, and `path-check` reaches step 10 in both places. A test in `src/core2/` names the place, seed and outlet record ids.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/core2/data/press/parameters.json

**Notes.** Found by the 56-place golden-path run, Oct 17 (claude); see docs/reports/golden-path-56-places-2026-10-17.md. The closure itself is the jobs engine ending the outlet's jobs (`closure` change), so the cause may be the outlet's revenue and payroll in the business engine rather than the press module.

**Measured Oct 17 (claude).** The closures are payroll failures: the organization-closed records are `employer-closed:2025-03-19:organization:press:newspaper:0:...` and `...:television:1:...`, closure source `work-payroll:2025-03-19:work-commitment:...reporter:0...`, so the outlet could not meet a payday. At the opening, Cobb Island's newspaper has `audienceRevenueMinor` 14,311,799 (about $143,000 a year) against a head at $36.07 an hour and a reporter at $27.64 an hour on 40-hour weeks (about $132,000 a year before employer taxes), and each station has 6,209,041 (about $62,000) against one reporter at about $57,000. Revenue and payroll are nearly equal at the opening, so employer taxes or the first payday before the first revenue payment can break them. Stations are sized as every station of one of the state's markets (`counts.tvStations / counts.tvMarkets` in `openPress`, `src/core2/modules/press.ts`), so a 1,774-person town gets four, each earning only the town's slice of its audience. Two things to settle: whether the first payday falls before the first revenue (a timing bug) and whether a market's station should staff a town by the town's share (a fraction of a reporter) rather than a whole reporter.

**The money the newspaper actually got (measured Oct 17, claude).** The newspaper's account in Cobb Island opens at $0 and held $5,497 on January 30, $2,607 on February 9, $1,352 on February 19, $4,117 on March 1 (a payment of about $2,765 came in that day), $2,994 on March 11, and $0 on March 21 after it closed on March 19. A head and a reporter at the hourly pay above cost about $11,000 a month, and the stated revenue is about $11,900 a month ($143,000 a year), but one month's payment delivered was about $2,765, about a quarter of it. The first thing to find is why the standing payment (`audienceRevenueMinor`, sized from the audience) delivers about a quarter of what the outlet's row states, before deciding whether a town this small should have the outlets at all.
