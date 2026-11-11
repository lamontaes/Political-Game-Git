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
after:
standard: 2
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A committee trade's deal names a section the bill no longer holds. On main at 758ba9c3bd the test "makes a trade in committee, with both sides reasons and the section on the bill" in `src/core2/legislature-committees.test.ts` fails in Achugao, Northern Mariana Islands (GOLDEN_PATH_SEED=0fa0de4be8c33033, attempt 0, place seed 3b0d7e363ddb0a8720b67bc3818f33d4fb365bd077f48d8f88932d8986675f3b). After two played years the bill bill:office:US-MP:legislature-lower:2025-09-01:official:term:seat:US-MP:governor:2025-01-20:58 carries an accepted committee trade with member official:term:seat:US-MP:lower:At-large:10:2025-01-20, but no section of the bill answers the question the deal's terms name. Either a later step replaced or struck the traded section and left the deal on the record as kept, or the deal was recorded for a section that never went in. Seen: the committee trade's line on the bill card, which names a section the bill still holds (a red golden-path test).

**Cause.** Needs cause. Looked at: `GOLDEN_PATH_SEED=0fa0de4be8c33033` in Achugao, Northern Mariana Islands (place seed 3b0d7e363ddb0a8720b67bc3818f33d4fb365bd077f48d8f88932d8986675f3b), the test above in `src/core2/legislature-committees.test.ts`; it fails the same way on clean main and on the rider-fix branch. The bill's sponsor is the governor (a bill proposed by the executive).

**Fix.** None until the cause is found.

**Time box.** 4 hours for one opus session.

**Rules.** The chain is the acceptance: a trade for a vote is followed from the deal record to the section on the bill and to the member's floor vote, by record id, and a deal whose section is gone is not a kept deal. Ask why: the proof names the step that removed or never added the section. No dice.

**Done when.** A second session runs `src/core2/legislature-committees.test.ts` with GOLDEN_PATH_SEED=0fa0de4be8c33033 and on 10 fresh draws and sees it pass. In the running game in that place and seed (dev mode, the bill page) the second session sees every accepted trade on the bill's committee record matched by a section on the bill, or marked as ended with the step that ended it, and a screenshot shows it.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.test.ts, src/bench/bill-stage.ts

**Notes.** Found by Fable on Nov 10 while checking the rider fix: the test fails the same way on clean main and on the branch, so it is not from that change. The bill's sponsor is the governor (a bill proposed by the executive).

**Notes (Fable's check, Nov 10).** How to find the cause: in the Achugao replay, follow the traded section's id through the committee trade code of src/core2/modules/legislature.ts. Either a later step struck the section and left the deal standing, or the deal was recorded for a section never added. The fix then makes the record and the bill agree (a traded section stays, or the deal ends with it), in the engine and not in the test.
