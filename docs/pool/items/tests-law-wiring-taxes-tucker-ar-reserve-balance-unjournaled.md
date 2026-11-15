---
id: tests-law-wiring-taxes-tucker-ar-reserve-balance-unjournaled
title: "law-wiring-taxes fails in Tucker, Arkansas: no journal entry names the state's minimum reserve balance law"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) running changed tests for PR 9356 and PR 9310, Nov 15 2026; the same red on the clean train e24cb825
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/core2/law-wiring-taxes.test.ts, "applies each law to people, groups and treasuries, moves money, and ends on repeal", fails with GOLDEN_PATH_SEED=612deadbcae7ad23 in Tucker, Arkansas (0570070): "no journal entry names a minimum-reserve-balance row: applied|us-policy-positions:fiscal.minimum-reserve-balance|US-AR government 0 of 1". The law is applied to the state government, but no journal entry names its row. It fails the same on the clean train e24cb825, without the estate or amount-bill changes. Guards: the reserve a state must keep, which the state budget reads before it spends.

**Cause.** Needs cause. Lead to check first: whether the state treasury's reserve hold is written as a journal entry at all, or only as a balance the budget reads, and whether Arkansas's starting row is one the test expects to move money.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Pinned tests: replay the named seed and keep every assertion as it stands. An effect is a read, not a record. One rule, all 56 places.

**Done when.** A second session runs the test at seed 612deadbcae7ad23 and it passes. In the running game, dev mode's state budget for a drawn state with the reserve law shows the reserve held and the journal line that names the law.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts

**Notes.**
