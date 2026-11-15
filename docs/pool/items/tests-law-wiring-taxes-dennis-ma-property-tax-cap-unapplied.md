---
id: tests-law-wiring-taxes-dennis-ma-property-tax-cap-unapplied
title: "law-wiring-taxes fails in Dennis, Massachusetts: the property tax growth cap has no applied record after play"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) running changed tests on train 5fe71dec7a24c98df9607273babee336d3be5a62, Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/core2/law-wiring-taxes.test.ts, "applies each law to people, groups and treasuries, moves money, and ends on repeal", fails in Dennis, Massachusetts (2516740) with GOLDEN_PATH_SEED=f090a9034b487078ca7c3d2a2c1a40207804ca4e: laws with no applied record after play are ["us-policy-positions:fiscal.cap-property-tax-growth"]. The test passes the cap, plays about half a year, and then asks which laws left an applied record. Guards: the property tax cap reaches homeowners' bills in a played world.

**Cause.** Found in code: two causes, both in the test's setup, none in the game. (1) The test passed the growth cap at the town's own level, but Massachusetts bars its places from making that cap (`localPowerBarred`, starting law `preempts`), so the town's act is void, the cap stays 0 and `propertyTaxTerms` registers no assessment cap. Measured at the seed: levels federal, state, county, township, city; barred true; the act at the city leaves the governing row at the state's starting row, value 0. (2) Behind it, the estate case picked the richest person with heirs: a House member (official:seat:US-CA:us-house:41) whose only heir, a partner aged 37 (person_55958daf6e076808), died of heart disease on 2025-10-25, inside the 270 days probate waits. With no heir the estate escheats and is assessed on nothing (`distribute` in src/core2/estates.ts, 26 U.S.C. 2055(a)(1)), so the estate tax paid was 0. Ordinary mortality, no bug in the estate code.

**Fix.** In the test only, every assertion kept: the cap is passed at the state level where the state bars local caps (`levelFor`), the estate case picks the person with the most heirs (up to two), then the richest, and the case is pinned to Dennis at its world seed (156 s, most of it the 270 days of probate the game waits).

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts
