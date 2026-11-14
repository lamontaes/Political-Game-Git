---
id: tests-law-reach-group-b-fails-in-setup
title: "The law-reach group B test fails in setup on the clean train and proves nothing"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found while changing the graduated-tax repeal (#9235), Nov 14"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: low
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** `src/core2/law-reach-group-b.test.ts` fails in setup, so none of its 32 cases run and the policies it covers (budget lines, a city income tax, the repeal of a graduated tax and more) are proved by nothing. A policy that changes the law and reaches no one would pass unseen. Seen: `npx vitest run src/core2/law-reach-group-b.test.ts` goes green with the cases counted as run, not skipped.

**Cause.** Measured: command `npx vitest run src/core2/law-reach-group-b.test.ts` in the test's own drawn places and seeds, run on clean train head 628ff74d: `Error: Module has no registered state.` from `moduleState` (src/core2/module-state.ts:234), reached through `sittingExecutiveOf` (src/core2/modules/budgets.ts:121), `executiveOfCut`, `amendBudget` (budgets.ts:2346) and the test's own `amend` (law-reach-group-b.test.ts:407). `sittingExecutiveOf` reads the offices module (`OFFICES_MODULE_ID`) since #8712 ("A budget line cut names the sitting executive"), and the test's setup installs only laws and budgets (`openLaws`, `openBudgets`, around line 151).

**Fix.** Design: install the offices module in the test's setup before budgets, or make `sittingExecutiveOf` return none where the offices module is not installed, as the other readers of optional modules do. Then run the file; a case that still fails for its own reason becomes its own item.

**Time box.** 1 hour for one Sonnet session at low effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix makes the cases run through the engines a played world uses, and a case that fails for its own reason is filed, never loosened or skipped. One rule, all 56 places: the cases that draw places keep drawing them and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main and sees its cases run with none skipped by a setup error, in a drawn place and seed each case names, with the result of each case named by record id where it writes one.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/modules/budgets.ts

**Notes.** Asked for by the Account lead on #9235. The pinned test `src/core2/graduated-repeal-flat-rate.test.ts` covers the graduated-tax repeal meanwhile.
