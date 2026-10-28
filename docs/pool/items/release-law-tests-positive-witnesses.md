---
id: release-law-tests-positive-witnesses
title: "Require positive groundwater and paid-leave law witnesses before accepting their played-world tests"
area: release
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/law-tests-positive-witnesses
pr: #5870
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-23T23:46:55.676Z
---

**What.** The played-world groundwater and paid-leave tests on main collect law-specific evidence without requiring it to exist. Groundwater can pass its controlled restriction comparison with no affected rule or sales flow, while paid leave can pass without any native full-person premium or counted withholding. Add positive witnesses so a green run demonstrates the claimed law effects, retaining the controlled boundary cases and drawing inputs independently of the effect being tested.

**Rules.** Wire to the world: require a real affected flow and named payment record in the generated world before accepting the law proof. One rule, all 56 places: draw suitable places from opening inputs, fail on bounded exhaustion, and do not select a convenient effect outcome.

**Done when.** On a fresh drawn seed and place, groundwater names an affected farm rule and nonzero sales flow and executes a positive limit comparison, and paid leave requires native premium payments for both tiers by record id. Missing effects fail the tests. Repeal and future-effective assertions remain, each changed test file passes on its integrated head, and each increased timeout has its own measured runtime in the PR body.

**Files.** src/core2/groundwater-law.test.ts, src/core2/paid-leave.test.ts, docs/release/changes/slow-test-timeouts.md

**Notes.** Sent back 2026-10-23 from PR #4987 (branch claude/slow-test-timeouts): the changed groundwater and paid-leave cases do not require positive law-specific flow witnesses, and combined runtime does not justify both timeout increases; finish on that branch, merge main into it first. These coverage gaps also exist on main; release-suite-red-list-core2 remains done and the independently claimed #5344 timeout item is untouched.
