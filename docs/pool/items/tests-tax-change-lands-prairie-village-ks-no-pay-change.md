---
id: tests-tax-change-lands-prairie-village-ks-no-pay-change
title: "tax-change-lands fails in Prairie Village, Kansas: no kept pay record changed after a city income tax"
area: laws
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/project-thread-8y55c8
pr: #9327
after:
blocked-on:
source: Found by the bargaining thread (brief O) running changed tests on train 5fe71dec7a24c98df9607273babee336d3be5a62, Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/core2/tax-change-lands.test.ts, "Prairie Village, Kansas: a city income tax lands on named workers as a felt change", fails with GOLDEN_PATH_SEED=8a0da6fd2c90c338: a worker felt the new tax is false ("passed over Prairie Village, Kansas: no kept pay record changed"). The test adds a city income tax and then reads which workers felt it. Guards: a city income tax shows in named workers' pay.

**Cause.** Found in code: two causes. (1) A paycheck's why is kept only for the player's circle and people in focus (`keepsWhy`, src/core2/why-kept.ts); the test sets bookkeeping off and focuses no one, so where nobody in the player's circle is paid in town (Prairie Village, seed 8aadc4ea...) no pay record is kept and none can change. (2) With workers in focus, `landWithholdingChange` (src/core2/modules/budgets.ts) compared a paycheck with the last of any kind and measured the whole take, so a council member's stipend (taxed on other lines than a job) and a commuter's pay (a graduated line falling) landed as felt gains from a city tax: mood +0.29, +0.21 and +0.08 against a law that took money.

**Fix.** The test focuses the first twenty workers by job id before the tax begins. `landWithholdingChange` compares a paycheck with the last one of the same kind (the payroll receipt's first segment) and measures only the changed law's own line of pay, then against now.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/tax-change-lands.test.ts, src/core2/modules/budgets.ts
