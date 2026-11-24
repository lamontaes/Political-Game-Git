---
id: core-income-award-follows-person
title: "A recorded income award follows its person to a new household"
area: core
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr: #4704
blocked-on:
source: "split from core-moves-pinned-and-income-stopgaps, Oct 15"
claimed-at:
---

**What.** A pension or Social Security award names the household it is paid into, and the core checks on every payment that the person is still in it, so a person whose award is paid into a household others stay in does not move away (SG-FIXER-moves-income-household). Add a core call that ends the award's route and opens the next in the new household, with its own dated record and the recorded award fact still the source, so these people can move like anyone else. The cash journal then shows the same monthly amount arriving at the new address.

**Rules.** Every dollar balances: the award's monthly amount is unchanged across the move and no payment is skipped or doubled. Wire to the world: the moved person's new household reads the income. Replace, never layer: the moves stopgap check is deleted when the call lands.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a person with an income award leaves a household others stay in, and the next month's payment lands in their new household, shown by the award's old and new contract ids and the cash journal record id; the moves and finance tests pass and SG-FIXER-moves-income-household is resolved.

**Files.** src/core2/finance-state.ts, src/core2/modules/moves.ts, src/core2/finance-types.ts

**Notes.** Found splitting core-moves-pinned-and-income-stopgaps. The award's household is validated against the recorded award fact in validateRecipientIncome, so the new route needs the fact to name the new household (a dated follow-up fact).

Sent back 2026-10-16 from PR #4704 (branch claude/core-income-award-follows-person): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4704 (branch claude/core-income-award-follows-person): The new income-award-follows-person.test.ts fails at line 61 in Superior, Montana (3072625), seed ab25bf66ebfe3fdb70607d942d926640: lives and homeBefore both remain household_496ab2bcc4edd068 after reviewMove. Ensure the fixture actually reaches a split-household departure and preserve the new-home/payment assertions. The other ten tests, typecheck, lint, zero-dice and release checks passed. Prettier also flagged finance-state.ts; its baseline status has not been established; finish on that branch, merge main into it first.

Checked 2026-10-16 against main and dropped as already done: its stopgap SG-FIXER-moves-income-household is resolved in stopgaps.json, no marker for it remains in src, and `finance-state.ts` (about line 249) re-routes a person's recorded income award when their household changes while `moves.ts` counts those awards in the household's income. Nothing is left to build; no PR of this item's own did the work.
