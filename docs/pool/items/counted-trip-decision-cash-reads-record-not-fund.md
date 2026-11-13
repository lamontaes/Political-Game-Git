---
id: counted-trip-decision-cash-reads-record-not-fund
title: "A counted household's trip decision reads its record's cash, the payment reads its group's fund, and the fund can be empty"
area: people
kind: bug
priority: 2
size: M
status: merged
standard: 2
claimed-by: claude/pool-counted-trip-decision-cash-reads-record-not-fund
pr: #8720
after:
blocked-on:
lead: laws
model: opus
effort: medium
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:38:37.040Z
branch: claude/pool-counted-trip-decision-cash-reads-record-not-fund
merged-at: 2026-11-12T22:44:47.888Z
---

**What.** In renewal.test.ts "where a restriction is law, the miles it adds to a counted household's trip are money its counted group paid under it" (seed 11, place 5400748 US-WV, world seed 3a11d3ee580c5255465b4fb37d44d2642f0dc00395923edbabc1c910c54594cc) a counted woman (person_579a712ae38ca2ec, 2025-08-01) decides to end a pregnancy: births-counted.ts reads cash as the sum of her record's people liquidMinor (193724) against a trip of 4728, but countedPayment (counted-money.ts) pays from the group's fund account, seeded once by fundGroups at the opening from the records' cash (scaled down if the place residents account holds less) and drained by the group's later flows. The log at the payment line: group 'group:jurisdiction_69b0188fc557a677:town:with-children:income-0:none:30-44:not-working', moved 0, stands 1, lawShare 0.217, lawPaid 0. So the household ends the pregnancy, pays nothing and no trip-lengthened-by-restriction row is written. Seen: whether a restriction's added miles cost a counted household money, shown in the law's reach on the bill card; also a red test on main.

**Cause.** Found in code: `src/core2/births-counted.ts` reads the trip decision's cash as the sum of the record's people `liquidMinor` (lines 382 and 1079), while `countedPayment` (`src/core2/counted-money.ts` line 856) pays from the group's fund account, which `fundGroups` (line 369) seeds once at the opening and later flows drain, so it can be empty. Measured: renewal.test.ts seed 11, place 5400748, world seed 3a11d3ee580c5255465b4fb37d44d2642f0dc00395923edbabc1c910c54594cc, group moved 0, lawPaid 0.

**Fix.** Make the decision and the payment read the same cash (the group's fund per household, or keep the records in step with it) and delete the second reading. A group that cannot pay does not end the pregnancy for free.

**Time box.** 6 hours for one Opus session.

**Rules.** One model, two tiers: a counted household's cash is one fact, so the decision and the payment it causes read the same cash. No dice: the decision reads that cash, never a draw. Replace, never layer: the second cash reading is deleted, not kept beside the first.

**Done when.** A second session runs the seed 11 case in `src/core2/renewal.test.ts` at place 5400748 with no cash filter and it passes. In a played world in that place and in one more drawn place (names and seeds written down) it finds the same household's trip decision and its payment reading the same cash, by decision row and journal entry. A counted group that cannot pay does not end the pregnancy, and the "trip-lengthened-by-restriction" row is written when the group pays under the law.

**Waits on.** Nothing.

**Files.** src/core2/births-counted.ts, src/core2/counted-money.ts, src/core2/renewal.test.ts

**Notes.** Found by red main Nov 2 behind renewal seed 11 (fails on main). Branch fixer/red-main-renewal-counted has only a cash filter in the test, which fixes nothing here; do not merge it. Probe recipe: log group, moved, lawPaid at the lawApplied line in births-counted.ts (about 1134).

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:38 UTC) on branch claude/pool-counted-trip-decision-cash-reads-record-not-fund.
