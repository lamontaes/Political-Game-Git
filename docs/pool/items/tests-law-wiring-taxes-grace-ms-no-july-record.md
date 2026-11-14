---
id: tests-law-wiring-taxes-grace-ms-no-july-record
title: "law-wiring-taxes fails in Grace, Mississippi: a corporation has no July profit tax record"
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

**What.** src/core2/law-wiring-taxes.test.ts, "keeps a corporation's unpaid profit tax owed to each treasury, through a zero-profit quarter and a repealed state rate", fails on train 5fe71dec in Grace, Mississippi (2828500) with GOLDEN_PATH_SEED=f090a9034b487078ca7c3d2a2c1a40207804ca4e: organization_5a54c273f2fc0be3 July record (1 locations set up) is undefined. The quarter it reads had no profit, so the record should exist with no new tax. Guards: a corporation's quarterly profit tax record, owed to each treasury, in a played world.

**Cause.** Needs cause. The red reproduces at the named seed on the train, and the test's own message is all that is known so far.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts
