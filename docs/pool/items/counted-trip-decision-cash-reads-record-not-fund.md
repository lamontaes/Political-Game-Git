---
id: counted-trip-decision-cash-reads-record-not-fund
title: "A counted household's trip decision reads its record's cash, the payment reads its group's fund, and the fund can be empty"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In renewal.test.ts "where a restriction is law, the miles it adds to a counted household's trip are money its counted group paid under it" (seed 11, place 5400748 US-WV, world seed 3a11d3ee580c5255465b4fb37d44d2642f0dc00395923edbabc1c910c54594cc) a counted woman (person_579a712ae38ca2ec, 2025-08-01) decides to end a pregnancy: births-counted.ts reads cash as the sum of her record's people liquidMinor (193724) against a trip of 4728, but countedPayment (counted-money.ts) pays from the group's fund account, seeded once by fundGroups at the opening from the records' cash (scaled down if the place residents account holds less) and drained by the group's later flows. The log at the payment line: group 'group:jurisdiction_69b0188fc557a677:town:with-children:income-0:none:30-44:not-working', moved 0, stands 1, lawShare 0.217, lawPaid 0. So the household ends the pregnancy, pays nothing and no trip-lengthened-by-restriction row is written.

**Rules.** One model, two tiers: a counted household's cash is one fact, so the decision and the payment it causes read the same cash. No dice: the decision reads that cash, never a draw. Replace, never layer: the second cash reading is deleted, not kept beside the first.

**Done when.** A counted household's trip decision and its payment read the same cash (the group fund per household, or the record kept in step with it); the seed 11 test passes at place 5400748 without a cash filter; a counted group that cannot pay does not end the pregnancy for free, proved in the played world by the decision row and the journal entry

**Files.** src/core2/births-counted.ts,src/core2/counted-money.ts,src/core2/renewal.test.ts

**Notes.** Found by red main Nov 2 behind renewal seed 11 (fails on main). Branch fixer/red-main-renewal-counted has only a cash filter in the test, which fixes nothing here; do not merge it. Probe recipe: log group, moved, lawPaid at the lawApplied line in births-counted.ts (about 1134).
