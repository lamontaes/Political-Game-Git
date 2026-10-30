---
id: gov-m3-01-fiscal-note-at-drafting
title: "The fiscal note at drafting is checked: a drafted bill's paper says who pays and how much, read from the records"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: governing/fiscal-note-at-drafting
pr:
blocked-on:
source: governing lead Oct 29
claimed-at: 2026-10-30T07:06:28.590Z
---

**What.** M3-01's test sentence says a fiscal note appears at drafting, and the register rules that every bill gets one (DECISION-REGISTER, "How laws reach people", Sept 26: "Every bill gets a fiscal note when drafted"). The engine writes `costEstimate` on every drafted bill (`costOf` in src/core2/modules/legislature.ts) and `billPaper` returns it as `estimate` (src/bench/legislature.ts), but no test asserts either: legislature.test.ts only prints `bill.costEstimate` in its report, and bill-paper.test.ts checks the section's before and after values, never the paper's `estimate`. A note that is zero for a wage bill that raises named workers would pass today. Assert the note against the employers' own records.

**Rules.** The chain is the acceptance: the note's workers and yearly pay are followed to the named work commitments whose pay the bill would raise, by record id. Estimate, never UNKNOWN: a bill whose cost the engine cannot count still shows an estimate with its source, never a blank. One rule, all 56 places: the place is drawn from all 56, never named in the test.

**Done when.** A test in src/bench/bill-paper.test.ts, in a drawn place built with buildBenchWorld and the seed it prints, drafts a minimum-wage bill through `seatAct` and finds `billPaper(...).estimate` equal to the bill's `costEstimate`, with its workers count equal to the open work commitments paid under the new floor (named by commitment id, as `employerCosts` counts them) and its yearly pay above zero when any are; a budget-line bill's paper carries its line amount.

**Files.** src/bench/bill-paper.test.ts, src/bench/legislature.ts, src/core2/modules/legislature.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-01 command (branch governing/m3-spec-commands). src/bench is the lane's; ask before editing. The screen half (the cost beside each part of the bill paper) is the lane's play-vote-and-bill-screens-redesign.
