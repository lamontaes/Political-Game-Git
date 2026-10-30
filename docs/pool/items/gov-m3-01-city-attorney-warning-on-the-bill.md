---
id: gov-m3-01-city-attorney-warning-on-the-bill
title: "A town bill on a power the state has not settled carries the city attorney's warning, on the bill and tested"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead Oct 29
---

**What.** M3-01's test sentence says a bill beyond the body's authority gets the city attorney's warning, as the register rules (DECISION-REGISTER, "A law changes the record first", Sept 22: "When a city proposes a measure whose authority is disputed, the city attorney warns the player and a lawful challenge may proceed"). The authority reader already returns `warning: "disputed"` for an unsettled or limited power (`unsettled` and the limited cell in src/core2/policy-authority.ts), and seatView passes the warning to the draft menu (src/bench/legislature.ts, about line 447). But `billPaper` carries no authority row, and no test drafts a town bill on a disputed power and checks that the warning reaches the player; policy-authority.test.ts checks the reader only on an unmapped fixture question at state level. Put the drafted bill's own authority warning on its paper, worded by the English engine, and test it.

**Rules.** An effect is a read, not a record: the warning counts only when the bill paper reads the bill's own authority row, by bill id. One rule, all 56 places: the disputed power comes from the powers catalog and the place's law records, never from a named state. No hand-written player text: the warning's words come from the English engine's banks (Words reviews).

**Done when.** A test beside src/bench/bill-paper.test.ts, in a drawn place built with buildBenchWorld and the seed it prints (GOLDEN_PATH_SEED preferred), drafts a council bill through `seatAct` on a power whose authority is disputed, finds the "disputed" warning on the bill's authority row and on `billPaper` by bill id, and a settled power on the same body carries none; the M3-01 command in docs/roadmap/features.json names that test file.

**Files.** src/bench/legislature.ts, src/bench/bill-paper.test.ts, src/core2/policy-authority.ts, docs/roadmap/features.json

**Notes.** Filed by the governing lead, Oct 29, from the M3-01 command (branch governing/m3-spec-commands): no test in that command asserts the warning. src/bench is the lane's and data/english is Words'; ask both before building. Related, not a twin: core-policy-authority-limited-cell-predicates turns limited cells into checks, which will settle some disputed grants.
