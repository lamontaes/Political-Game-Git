---
id: gov-more-governor-term-starts
title: "Governors' term starts for five more states are read from their constitutions"
area: gov
kind: stopgap
priority: 3
size: S
status: in-pr
claimed-by: claude/fs11vb-more-term-starts
pr: #5469
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:33:20.800Z
---

**What.** The governor start clause is read for eight states in term-starts.json; this adds California (the Monday after January 1), Colorado (second Tuesday of January), Illinois and Indiana (second Monday) and New Jersey (third Tuesday). Each row cites its constitution or statute and is tagged SOURCED, except Indiana, which is ESTIMATED from the 1851 text and a 2025 inauguration. The other states' governor clauses are still unread, so SG-GOV-term-end-estimate stays open.

**Rules.** No dice: the start day is the state's rule, not a roll. One rule, all 56 places: the rows live in data and the code names no state.

**Done when.** src/core2/elections-law.test.ts shows each of the five states' governor term starting on its rule's day, including California's January 1 that falls on a Monday giving January 8.

**Files.** src/core2/data/elections/term-starts.json, src/core2/elections-law.test.ts

**Notes.** Stacked on the branch of PR 5160, which adds the rule format.
