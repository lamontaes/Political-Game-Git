---
id: housing-builders-start-nothing-after-the-opening
title: "Builders start almost no house or apartment building anywhere after the world opens"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
source: Laws thread, Nov 15, 2026, pinning the gas hookup ban's test (the Train's known red on law-wiring-prices)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
claimed-at:
branch: claude/project-thread-8fxsy5
---

**What.** After the opening, a town's builders start almost nothing: at Wilton, Maine (4,000 people) and Eveleth, Minnesota no house or apartment building was started in 760 days, so no new homes come on the market. Laws that act on new building (the gas hookup ban, inclusionary set-asides, by-right apartments, farmland protection) reach no builder. Seen: the gas hookup ban's law page and dev mode's reach name no builder; Housing shows no new homes for sale.

**Cause.** Found in code: `openHousing` (src/core2/modules/housing.ts) stored the builders' opening price level as `macroPrices(api)?.(date) ?? 1`, and at the opening the economy has kept no month yet, so it stored 1; from the first month `buildMonth` (src/core2/housing-construction.ts) divided the price index (about 312) by 1, and starts, which go with value over cost to the power 1.5, fell to about 1/5,500 of their rate. Measured: Wilton, Maine (2385815), world seed 056520284c241460: the macro table is empty on 2025-01-20 and 312.4 for 2025-01 a month later; the stock row's carry of houses moved from 0.7959 to 0.7961 in a month.

**Fix.** `openStock` records no price base while the economy has kept no month (0), and `buildMonth` takes the first month built in as the base, as it already does for the home value and rent; `build` waits a month when the economy is running and has kept no month yet. The player sees new homes for sale in Housing and the gas hookup ban naming the builder on its law page.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** One rule, all 56 places: every place's builders read the same base. Estimate, never UNKNOWN: no stand-in price of 1.

**Done when.** A second session plays a drawn place with a construction business for a year and sees houses started in town (Housing's new homes for sale, or dev mode's reach of the gas hookup ban once it is enacted), and src/core2/housing-builders-start.test.ts passes on main.

**Waits on.** Nothing.

**Files.** src/core2/housing-construction.ts, src/core2/modules/housing.ts, src/core2/housing-builders-start.test.ts (new)

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-8fxsy5 since 2026-11-15 23:43 UTC, more than twice its 2-hour time box. Continue on branch claude/project-thread-8fxsy5.
