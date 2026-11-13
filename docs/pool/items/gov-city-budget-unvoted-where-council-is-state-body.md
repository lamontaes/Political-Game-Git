---
id: gov-city-budget-unvoted-where-council-is-state-body
title: "A city budget is voted where the place's council is modeled as its state-level legislature"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-gov-city-budget-unvoted-where-council-is-state-body
pr: #8733
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-11T06:37:21.629Z
after:
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
branch: claude/pool-gov-city-budget-unvoted-where-council-is-state-body
---

**What.** Where a place's city and state government are one body, the city budget now goes to a vote, but nobody proposes a change to it. Re-run Nov 11 on main 3902fe68c5 at place 1150000 (world seed f73674b020840528c35ee69e493ace9ce2b5ece15f39c2162b48622e3256ae64) for 400 days: `budget:place:1150000:2025` was adopted by the Council of the District of Columbia, 13 to 0, on bill HB 22, with no line changed; its administration line stayed at 175517604864. The state-level budget `budget:US-DC:2025` passed the same way. In the town's own budget, the executive's proposal is what moves lines. Make the executive over the body that votes a budget propose its changes wherever that body sits. Seen: Politics, Budgets, where the adopted budget shows the mayor's proposed changes and the council's vote on them.

**Cause.** Found in code: `executivePriorities` in `src/core2/modules/legislature.ts` (line 1250) looks for an office of the veto holder's kind (`vetoHolder` in `src/core2/data/offices/bodies.json`: `mayor` for a city, `governor` for a state) whose level equals the government's own (line 1269). In this world the city government is `place:1150000` (level city), and the only executive is `office:US-DC:mayor` (kind mayor, level state). The state government `US-DC` has no `governor`. So neither government finds an executive, `executivePriorities` returns null, and `budgetBillSections` (line 891) drafts the departments' requests at the enacted funding, every section `value: 0`. `budgetChambers` (line 1321) does route the city's budget to the state's council, so the symptom recorded on Oct 25 (carried forward unvoted) no longer happens; what is left is that no one proposes. The session engine already finds the right executive for a body: `executiveOf` (line 5208) returns the elected mayor, governor, county executive or president in the voting body's jurisdiction, which here is the mayor.

**Fix.** In `executivePriorities`, when no office of the veto holder's kind sits at the government's own level, take the executive from `executiveOf(api, chambers.chambers[0])`, the body that votes this budget. Pass `chambers` in from `budgetBillSections`, which already has it. Keep the level match first, so every other place is unchanged. Apply the same rule to the state-level government `US-DC`, whose executive kind is not `governor`. Add `src/core2/legislature-budget-one-body.test.ts` (new). It draws a place whose city budget is voted by the state's chambers, found by `budgetChambers`, not by name. It runs to the first budget vote and checks that the city's and the state's budget bills carry the mayor's proposed changes, at least one section nonzero, with the vote recorded.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the route comes from the place's government records, never a place named in logic. No dice: the council's vote decides by its members' views, duty and the law. Replace, never layer: the carried-forward default stays only for a budget whose body did not vote.

**Done when.** A second session replays place 1150000 (world seed above) for 400 days with `buildBenchWorld` and sees `budget:place:1150000:2025` adopted by a recorded council vote on a bill whose sections carry the mayor's proposed changes (`setBy` the mayor's term), with at least one line differing from the 2024 budget. Politics, Budgets shows the adopted line. `src/core2/legislature-budget-one-body.test.ts` passes on that place and on a second seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/data/offices/bodies.json, src/core2/legislature-budget-one-body.test.ts (new)

**Notes.** Found Oct 25, 2026 by the fixer on PR 5588 (office-budget-line-reaches-pay): the merger's drawn place 1150000, world seed f73674b020840528c35ee69e493ace9ce2b5ece15f39c2162b48622e3256ae64, kept its administration line at 190276913260 because the city budget (budget:place:1150000:2025) was carried forward unvoted; the council's own budget bill (HB 34) passed with every line 0.

Sent back 2026-10-25 from PR #5588 (branch claude/budget-line-reaches-pay): current-main head e0c51ae576 fails the raise payroll proof at budget-line-administration-staffing.test.ts:192 in Worley, Idaho (1688480), independent root cef553a7f374d5e75a07778b1a15fd77, world seed c178de8f3b3288aac2e9dd092ab200910a1abdec5c2dc6eeb443e826535e5850 (adopted administration 2373322 + 1582214, zero new hires); preserve this failure, prove shared-government payroll and add the routing item's Done-when table row (the body still says proof only); finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #5588 (branch claude/budget-line-reaches-pay), checked 542f2acd5c14c56819112d845f12404f7183d801: the fresh root 4d270ecee38ac27ae50d1415c8d9cdcb draws Breda, Iowa (1908290), world seed 9c556e9e0b8b774aea57fc3f814fde92c552f37336befced09bbcb890e492429; a raise from 3922954 by 2615302 fills a counted job (person_4db3017461d05b47, group), but the test at line 221 counts only new full-person jobs and fails. Preserve this input and the named cut/payroll assertion; prove a nonempty legitimate hire and its actual later payment in either tier, not just an applied record. Original shared-government payroll/full-year recheck is still required and was not claimed green. Paired ADMIN_LINE_PLACE_KEY and ADMIN_LINE_WORLD_SEED now replay the original input without changing default draws or assertions. Finish on that branch, merge main into it first.

Merger 0, Oct 26: Sent back again from PR #5588 (branch claude/budget-line-reaches-pay), merged-main head fe5a8a6391: the counted-hire/payday correction fixes the prior single-tier check, but the author explicitly hands back Cornlea (3110600) with no hire in either tier within 75 days and only a truncated replay seed; test:254-257 remains unsatisfied and the body still claims the older all-green head. Preserve the complete input, distinguish absent eligible seekers from broken hiring through pre-treatment records without output redraw or forced hires, and update current evidence; finish on that branch, merge main into it first. No new local green gate claimed.

Sent back 2026-10-26 13:07 UTC from PR #5588, corrective ee124896abf09900b23550eb5f8c280d58206940 (branch claude/budget-line-reaches-pay): merging current main f5e368528a conflicts in src/core2/budget-line-schools-staffing.test.ts, src/core2/law-reach/group-a-staffing.ts and src/core2/modules/legislature.ts. The normal merge was aborted without code resolution or push. Complete Cornlea input is acknowledged but conditional raise acceptance is not yet locally reviewed; preserve original Cornlea, Breda and D.C. inputs, main shared-tier staffing/strengthened tests and current legislature paths. No completed gate claimed. Finish on that branch, merge main into it first.

Nov 11 (cause finder for Fable B): re-ran place 1150000 at the world seed above on main 3902fe68c5 for 400 days. The city budget is now voted (13 to 0, HB 22), so the old symptom is gone. But the bill changes no line, because `executivePriorities` matches the executive by level and D.C.'s mayor is seated at the state level, so neither D.C. government finds one. The fix reads the executive from the voting body, as the session engine does.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:37 UTC) on branch claude/pool-gov-city-budget-unvoted-where-council-is-state-body.
