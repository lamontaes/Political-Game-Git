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

**What.** src/core2/law-wiring-taxes.test.ts, "applies each law to people, groups and treasuries, moves money, and ends on repeal", fails on train 5fe71dec in Dennis, Massachusetts (2516740) with GOLDEN_PATH_SEED=f090a9034b487078ca7c3d2a2c1a40207804ca4e: laws with no applied record after play are ["us-policy-positions:fiscal.cap-property-tax-growth"]. It fails the same with and without the amount-bills change. Earlier items on this assertion (tests-law-wiring-taxes-greenville-ri-red, tests-law-wiring-taxes-quinhagak-corporate-row) named other laws and are closed. Guards: the property tax cap reaches homeowners' bills in a played world.

**Cause.** Needs cause. The red reproduces at the named seed on the train, and the test's own message is all that is known so far.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts
