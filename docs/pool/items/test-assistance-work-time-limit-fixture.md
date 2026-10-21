---
id: test-assistance-work-time-limit-fixture
title: "The assistance work-requirement case fails in towns where no adult reaches the welfare time limit (Leipsic, Delaware; Wilson, Wyoming)"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In law-reach-group-b.test.ts the assistance work requirement case asserts that some adult reaches the welfare time limit, but its town is drawn only for the Medicaid and preschool shapes. With GOLDEN_PATH_SEED gb-ev-1 (Leipsic, Delaware, place 1041700) and gb-ev-2 (Wilson, Wyoming, 5683765) it fails with 'nobody reached the time limit: expected 0 to be greater than 0', while the same file passes elsewhere. Make the setup keep drawing until the town also has an adult the time limit reaches, as it does for the other shapes, and fail naming every place tried when none does.

**Rules.** Never loosen or skip the case: the setup finds a town that can show the behavior, as the Medicaid shape does. One rule, all 56 places: draw places from all 56 and name each place and seed tried.

**Done when.** With GOLDEN_PATH_SEED gb-ev-1 and gb-ev-2 the assistance work requirement case of src/core2/law-reach-group-b.test.ts passes in a town the setup drew because an adult there reaches the welfare time limit, naming the place and seed, and the setup throws listing every place tried when none qualifies in its bounded draws.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** Found while finishing test-assistance-work-counted-payments-rounding (PR 5730).

Oct 21 (claude, claude/assist-time-limit), tried and reverted. Adding "a welfare head the assistance work requirement reaches" (`selectResidents` with `groupBPolicy(work).people` against the heads `{incomeBelowPovertyShare: "assistanceIncomeShare", householdHead: true}`) to `build()`'s redraw condition makes every draw fail in 40 attempts (seeds gb-ev-1 and gb-ev-2 both threw, naming each place tried, with Medicaid, work-requirement and preschool counts nonzero in several, for example Leipsic, Delaware 1041700: Medicaid 6, work requirement 4, preschool 1, welfare head reached false). At the opening the requirement reads each member's weekly work minutes, which come from work commitments that do not exist until the world has run for a while, so the setup cannot see who the requirement will reach. The case needs its own redraw loop that builds a world, lets it run past the first payroll weeks, and checks for a reached welfare head before the case runs (a new `describe` with its own `beforeAll`, not the shared `build()`), or the case should read the time-limit drawers from the `draw|` rows.
