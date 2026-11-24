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
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** A committee trade's deal names a section the bill no longer holds. On main at 758ba9c3bd the test "makes a trade in committee, with both sides reasons and the section on the bill" in `src/core2/legislature-committees.test.ts` fails in Achugao, Northern Mariana Islands (GOLDEN_PATH_SEED=0fa0de4be8c33033, attempt 0, place seed 3b0d7e363ddb0a8720b67bc3818f33d4fb365bd077f48d8f88932d8986675f3b). After two played years the bill bill:office:US-MP:legislature-lower:2025-09-01:official:term:seat:US-MP:governor:2025-01-20:58 carries an accepted committee trade with member official:term:seat:US-MP:lower:At-large:10:2025-01-20, but no section of the bill answers the question the deal's terms name. Either a later step replaced or struck the traded section and left the deal on the record as kept, or the deal was recorded for a section that never went in. Seen: the committee trade's line on the bill card, which names a section the bill still holds (a red golden-path test).

**Cause.** Measured: `GOLDEN_PATH_SEED=0fa0de4be8c33033 npx vitest run src/core2/legislature-committees.test.ts -t "makes a trade in committee"` on 758ba9c3bd, the commit the item was found on, in Achugao, Northern Mariana Islands, with a print of the failing bill and its budget, since removed. On current main (75e91513b3) the same seed stops earlier with "The country tier holds counts that cannot be" (`core-country-tier-more-jobs-than-workers-in-outcome-web-tests`), so the replay was on the older commit. The bill is the territory's budget bill, HB 11 (`kind: budget`). On 2025-09-21 the committee's markup traded member official:term:seat:US-MP:lower:At-large:10:2025-01-20 a policy section for their vote (`add us-policy-positions:government-operations.automatic-voter-registration yes`; `adopt` in `src/core2/modules/legislature.ts`, line 4588). At the budget vote, `councilBudget` (line 996) bargains over the bill's sections when the vote fails. It treats every section as a budget line: `lineOf` (line 1090) reads the policy section's line as "undefined", halves its value three times and then drops it (lines 1091 to 1115). The adopted budget records it as `{"line": "undefined", "how": "dropped", "times": 3}`, and the bill is written back with `provisions: kept` (line 1197). The deal on `bill.deals` is never touched, so it stays `accepted` for a section the bill no longer holds.

**Fix.** In the budget vote's bargaining in `councilBudget` (`src/core2/modules/legislature.ts`, lines 1090 to 1115): a section that is not a budget line is never halved. When it is the most objected-to section, it is dropped whole in one step and recorded in `amendments` by its question, not as "undefined". When a section is dropped, any `trade-amendment` deal whose terms name it gets `status: "ended"`, with the date and `endedBy: "budget negotiation"`, in the bill row written at line 1194. In `src/core2/legislature-committees.test.ts`, the trade case checks accepted deals against the bill's sections, and checks that an ended deal names the step that ended it. Do not let a deal pass without its section. Extend the `Deal` status type where it is declared.

**Time box.** 2 hours for one Sonnet session.

**Rules.** The chain is the acceptance: a trade for a vote is followed from the deal record to the section on the bill and to the member's floor vote, by record id, and a deal whose section is gone is not a kept deal. Ask why: the proof names the step that removed or never added the section. No dice.

**Done when.** A second session runs `src/core2/legislature-committees.test.ts` with GOLDEN_PATH_SEED=0fa0de4be8c33033 (once the country-tier red is fixed on main) and on 10 fresh draws, and sees it pass. In a played world in a drawn place (named with its seed), the second session reads a budget bill whose committee traded a policy section, and sees every `accepted` trade-amendment matched by a section on the bill, or marked `ended` by the budget negotiation with its date, by bill and member record ids. The bill page in dev mode shows the trade's line as kept or ended.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.test.ts, src/bench/bill-stage.ts

**Notes.** Found by Fable on Nov 10 while checking the rider fix: the test fails the same way on clean main and on the branch, so it is not from that change. The bill's sponsor is the governor (a bill proposed by the executive).

**Notes (Fable's check, Nov 10).** How to find the cause: in the Achugao replay, follow the traded section's id through the committee trade code of src/core2/modules/legislature.ts. Either a later step struck the section and left the deal standing, or the deal was recorded for a section never added. The fix then makes the record and the bill agree (a traded section stays, or the deal ends with it), in the engine and not in the test.

Nov 11 (cause finder for Fable B): replayed the item's seed on 758ba9c3bd in a sparse worktree with a print of the bill and its budget, since removed. The bill is the territory's budget bill. The committee traded a holdout a policy section, and the budget vote's bargaining then halved it three times as a line called "undefined" and dropped it, leaving the deal accepted. On current main 75e91513b3 the seed stops earlier on the country-tier red. Two fresh draws (66171228606fd72e, 13c17d10984cd600) passed the case on main, and a third (678e7b1ba31d7cda) ran no tests.
