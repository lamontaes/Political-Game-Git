---
id: laws-amount-bill-keeps-the-laws-unit
title: "An amount bill whose section names no unit enacts the law in the law's own unit, not percent"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9902
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, crew line #9747 item 8c, Nov 17, 2026, seen on the SSI bill card while proving #9898
model: opus
effort: low
root: rc8-law-judged-by-paperwork
---

**What.** A law-amount bill section that names no unit is enacted with the unit "percent" (or "minor/hour" for the minimum wage), whatever unit the law it amends is in. Dev mode's Introduce files its sections without a unit, so a bill raising SSI's federal benefit rate, a law in dollars a month, enacts "1193 percent", and the bill card says so beside the "994 USD/month" row it replaced. The bill section itself already keeps the law's own unit ("A bill sets the law's amount, never its unit"); only the enacted row did not. Seen: dev mode's bill card for the SSI rate bill at Pownal Center, Vermont, on Nov 17, where the new law reads 1193 percent.

**Cause.** Found in code: the enactment in src/core2/modules/legislature.ts takes `shaped?.unit ?? provision.unit ?? (minimum-wage ? "minor/hour" : "percent")`, skipping the unit of `current`, the row it amends (`amendedRow`).

**Fix.** Read the amended row's unit before the default.

**Time box.** 1 hour for one Opus session at low effort.

**Rules.** One rule, all 56 places: the unit comes from the law row the bill amends in whichever place it is filed.

**Done when.** A second session, in a drawn place, Town, State (seed printed), passes a Congress bill raising SSI's federal benefit rate in dev mode and reads "USD/month" for the new law on the bill card; `src/bench/amount-bill-keeps-its-unit.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/bench/amount-bill-keeps-its-unit.test.ts (new)
