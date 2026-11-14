---
id: tests-tax-change-lands-prairie-village-ks-no-pay-change
title: "tax-change-lands fails in Prairie Village, Kansas: no kept pay record changed after a city income tax"
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

**What.** src/core2/tax-change-lands.test.ts, "Prairie Village, Kansas: a city income tax lands on named workers as a felt change", fails on train 5fe71dec with GOLDEN_PATH_SEED=8a0da6fd2c90c338: a worker felt the new tax is false ("passed over Prairie Village, Kansas: no kept pay record changed"). The test's other case passes. Guards: a city income tax shows in named workers' pay.

**Cause.** Needs cause. The red reproduces at the named seed on the train, and the test's own message is all that is known so far.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/tax-change-lands.test.ts
