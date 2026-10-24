---
id: test-assistance-work-time-limit-fixture
title: "The assistance work-requirement case fails in towns where no adult reaches the welfare time limit (Leipsic, Delaware; Wilson, Wyoming)"
area: laws
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #5801
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In law-reach-group-b.test.ts the assistance work requirement case asserts that some adult reaches the welfare time limit, but its town is drawn only for the Medicaid and preschool shapes. With GOLDEN_PATH_SEED gb-ev-1 (Leipsic, Delaware, place 1041700) and gb-ev-2 (Wilson, Wyoming, 5683765) it fails with 'nobody reached the time limit: expected 0 to be greater than 0', while the same file passes elsewhere. Make the setup keep drawing until the town also has an adult the time limit reaches, as it does for the other shapes, and fail naming every place tried when none does.

**Rules.** Never loosen or skip the case: the setup finds a town that can show the behavior, as the Medicaid shape does. One rule, all 56 places: draw places from all 56 and name each place and seed tried.

**Done when.** With GOLDEN_PATH_SEED gb-ev-1 and gb-ev-2 the assistance work requirement case of src/core2/law-reach-group-b.test.ts passes in a town the setup drew because an adult there reaches the welfare time limit, naming the place and seed, and the setup throws listing every place tried when none qualifies in its bounded draws.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found while finishing test-assistance-work-counted-payments-rounding (PR 5730).

Oct 21 (claude, claude/assist-time-limit), tried and reverted. Adding "a welfare head the assistance work requirement reaches" (`selectResidents` with `groupBPolicy(work).people` against the heads `{incomeBelowPovertyShare: "assistanceIncomeShare", householdHead: true}`) to `build()`'s redraw condition makes every draw fail in 40 attempts (seeds gb-ev-1 and gb-ev-2 both threw, naming each place tried, with Medicaid, work-requirement and preschool counts nonzero in several, for example Leipsic, Delaware 1041700: Medicaid 6, work requirement 4, preschool 1, welfare head reached false). Observed: the combined draw fails on every attempt. Unproved hypothesis, not a finding: the selector (group-b-people.ts) defaults a missing weekly-minutes value to 0 and excludes a resident only when weeklyMinutes is at least the hours threshold, so missing opening work commitments do not by themselves explain a zero reached-head selection. The next session should trace which predicate removes each candidate head (age, income share, household head, hours) in the drawn places listed here before prescribing a fix; the case may need its own redraw loop that lets a world run past the first payroll weeks, or the case should read the time-limit drawers from the `draw|` rows.

Sent back 2026-10-22 from PR #5801 (branch claude/assistance-work-fixture): Merging current main conflicts in src/core2/law-reach-group-b.test.ts, in build around lines 98 and 147. Main wraps the opening with withPublicSchoolDistrict and adds required private-school, school-job and highway-line shapes for its other cases; this branch adds the separate time-limit shape and tried-place capture. Reconcile those conditions so each describe draws what its own assertions require, preserving main school setup and the bounded time-limit search. A counted-only time-limit draw must still execute an actual payment assertion rather than succeeding through empty named loops or a skipped aggregate-payment check. I aborted the local merge without pushing or changing assertions; no integrated head or local gate pass exists. Resolve with a plain main merge and rerun the changed-file gates plus the required gb-ev-1, gb-ev-2 and drawn cases.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5799 (branch claude/assist-time-limit): The notes-only completion routing is appropriate. The new Notes causal claim is not supported by the selector: it says missing opening work commitments mean the setup cannot see anyone the work requirement reaches. On current main, group-b-people.ts:180 and :232 default missing weekly minutes to 0, and :306 excludes residents only when weeklyMinutes is at least the hours threshold; the assistance policy uses hoursBelowPerWeek. Missing hours therefore do not explain a zero reached-head selection. Keep the observed failed combined draws, but either label the payroll explanation as an unproved hypothesis or supply a predicate trace showing what actually removes those heads before prescribing that fix. This PR opened 2026-10-21T11:39:19Z after the evidence-table cutoff, so add the required Done when table for the actual note scope. No local standard gate pass or fixture completion is claimed; a missing gate line is not the objection.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5801 (branch claude/assistance-work-fixture): the counted-only draw can skip every named-head repeal assertion; require a nonempty stopped recipient and positive named or counted repayment after repeal, retaining both regression seeds; finish on that branch, merge main into it first.
