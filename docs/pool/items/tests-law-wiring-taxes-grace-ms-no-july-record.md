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

**What.** src/core2/law-wiring-taxes.test.ts, "keeps a corporation's unpaid profit tax owed to each treasury, through a zero-profit quarter and a repealed state rate", fails in Grace, Mississippi (2828500) with GOLDEN_PATH_SEED=f090a9034b487078ca7c3d2a2c1a40207804ca4e: organization_5a54c273f2fc0be3 July record (1 locations set up) is undefined. The test sets up a corporation, plays to July 1, and reads that quarter day's record. Guards: a corporation's quarterly profit tax record, owed to each treasury, in a played world.

**Cause.** Found in code: the place's one corporation location (organization_5a54c273f2fc0be3, losing money: quarter minor -8,164,536 against sales 8,540,084) closed on 2025-07-01, the quarter day itself. A closed business's books are skipped by the profit tax (`payProfitTaxes` in src/core2/modules/employer-taxes.ts continues on `books.closedAt`), so no record is written, and the test read one. The test took its location the day before, when it was still open; it redraws a place with no open location in October but not in July.

**Fix.** In the test only, every assertion kept: the case is pinned to Newport, Delaware (place 1051190, world seed bcec8e61...), a small place with a federal and a state corporate rate whose eight locations stay open through July 1 (55 s). Grace is not used because its one location closes that day; the test fails with that reason if every location closes.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion of the test exactly as it stands. Wire to the world: the law must reach the people or treasury it names in a played world, read by another engine.

**Done when.** The test passes at the named seed on the train. A second session then runs the same test in a drawn place of its own choosing, and sees in the running game that the law's applied record names the person or treasury it reached, by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts
