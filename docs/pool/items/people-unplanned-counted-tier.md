---
id: people-unplanned-counted-tier
title: "Counted women follow the unplanned-pregnancy rule times their count"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-unplanned-pregnancy-decision
source: "split from people-unplanned-pregnancy-decision, Oct 19"
---

**What.** The unplanned-pregnancy exposure, the law read and the decision apply to counted women of reproductive age in a household group at the group's weight, in the same monthly flows as counted births. A counted woman who is filled in matches what the counts said.

**Rules.** No dice. An effect is a read, not a record. One rule, all 56 places. One model, two tiers. No hand-written player text. Look before you ask: owner decisions are in SG-PEOPLE-unplanned-pregnancy.

**Done when.** In a drawn place (name and seed in the PR body) a counted group's births and its unplanned endings in a played year are the full-person rule times the count, shown by record id in src/core2/births-counted.test.ts.

**Files.** src/core2/births-counted.ts, src/core2/births-unplanned.ts

**Notes.** The first part (exposure, the decision, the law read) is in the people-unplanned-pregnancy-decision PR; see src/core2/births-unplanned.ts.

Looked at Oct 19: counted births in `applyCountedFlows` (src/core2/births-counted.ts, lines 520 to 580) are already the state's real age rates times the outcome web's `births.rate` factor, which carries the abortion-law link; mothers are ranked by `birthStanding`, not decided by the full-person rule. `decideUnplanned` in src/core2/births-unplanned.ts reads `api.state.people` and a full household, so it cannot take a counted record as it stands. The build is to give `decideUnplanned` and `unplannedExposure` a record-based input (the counted woman's household record) and run them per counted woman at her group's weight, replacing the rate-only birth step for unplanned births so the law's effect is not counted twice.
