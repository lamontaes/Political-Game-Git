---
id: core-finance-writer-own-illness-provider-red
title: "Four finance writer tests stop at an unregistered work.own-illness reason provider on main"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: clean main af83f0e661, found while validating the unused funding-plan cleanup
---

**What.** Four finance-writer-contract.test.ts cases fail on clean main with an unregistered work.own-illness reason provider. Their free work admission reaches scoreOffers with that binding but no provider installed in the minimal fixture. The exception prevents the tests from reaching their intended closure, rejected-admission and finite-lender conservation assertions, so repair the fixture wiring or the owning eligibility gate at its source.

**Rules.** Wire to the world: work offers must have the providers required by the actual work setup. Replace, never layer: fix the missing registration or its eligibility cause without adding a silent fallback, skipping a case or weakening the finance assertions.

**Done when.** All 27 finance-writer-contract.test.ts cases pass, including the four previously failing work-admission cases, with their actual committed WorkResult, closure-evidence and finite-cash assertions preserved. Run that test file by path and the changed-file checks; the repair must not hide an absent provider behind a default zero or suppress the tested work path.

**Files.** src/core2/finance-writer-contract.test.ts, src/core2/modules/work.ts, src/core2/choice.ts

**Notes.** Reproduced on clean frozen main af83f0e661 and on the main-integrated cleanup head: can resolve closure from an actual quiet committed WorkResult; preserves closure evidence when a returned receipt is modified; does not borrow or pay when worker admission cannot commit; funds wages across approved lines with a shared finite lender. All four throw Unregistered reason provider: work.own-illness at choice.ts:364 through freeAttendance in finance-writer-contract.test.ts:390. The other 23 finance cases pass. This baseline failure is separate from removal of the unused funding-plan calculator.
