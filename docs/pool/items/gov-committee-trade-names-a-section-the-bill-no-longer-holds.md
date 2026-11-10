---
id: gov-committee-trade-names-a-section-the-bill-no-longer-holds
title: "A committee trade's deal names a section the bill no longer holds (Achugao, Northern Mariana Islands, seed 0fa0de4be8c33033)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: legislation
source: Fable, Nov 10, 2026, found red on clean main while checking the rider fix
---

**What.** On main at 758ba9c3bd the test 'makes a trade in committee, with both sides reasons and the section on the bill' in src/core2/legislature-committees.test.ts fails in Achugao, Northern Mariana Islands (GOLDEN_PATH_SEED=0fa0de4be8c33033, attempt 0, place seed 3b0d7e363ddb0a8720b67bc3818f33d4fb365bd077f48d8f88932d8986675f3b). After two played years the bill bill:office:US-MP:legislature-lower:2025-09-01:official:term:seat:US-MP:governor:2025-01-20:58 carries an accepted committee trade with member official:term:seat:US-MP:lower:At-large:10:2025-01-20, but no section of the bill answers the question the deal's terms name. Either a later step replaced or struck the traded section and left the deal on the record as kept, or the deal was recorded for a section that never went in. Find which, and make the record and the bill agree: a traded section that is later struck ends the deal on the record, with the step that struck it.

**Rules.** The chain is the acceptance: a trade for a vote is followed from the deal record to the section on the bill and to the member's floor vote, by record id, and a deal whose section is gone is not a kept deal. Ask why: the proof names the step that removed or never added the section.

**Done when.** The test src/core2/legislature-committees.test.ts passes with GOLDEN_PATH_SEED=0fa0de4be8c33033 and on 10 fresh draws, and a second session opens the bill in the running game in that place and seed (dev mode, the bill page) and sees every accepted trade on its committee record matched by a section on the bill, or marked as ended with the step that ended it, in a screenshot. The owner plays it: a bill's page never shows a trade for a section the bill does not have.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.test.ts, src/bench/bill-stage.ts

**Notes.** Found by Fable on Nov 10 while checking the rider fix: the test fails the same way on clean main and on the branch, so it is not from that change. The bill's sponsor is the governor (a bill proposed by the executive).
