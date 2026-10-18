---
id: tests-early-returns-residents-retirees
title: "Four residents tests end early in a place without a retiree or a zero-day payday"
area: core
kind: cleanup
priority: 3
size: S
status: claimed
claimed-by: claude/residents-test-draws
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T02:41:05.105Z
---

**What.** Four tests in `src/core2/residents.test.ts` ended with a bare `return` when the drawn place lacked the case they check, so they passed without checking anything: a payday whose whole period came before the opening, a filled-in counted retiree paid their own income, retirees paid at the benefit level in force, and a worker who retires at that level. Draw further places until one has the case and fail by name, listing the places passed over, when none does.

**Rules.** A test reaches an applicable case or fails clearly; it never passes empty. One rule, all 56 places: the draw is from all 56 and names place and seed. No assertion is loosened or dropped.

**Done when.** The grep for bare early returns finds none of the four lines in `src/core2/residents.test.ts`, the file passes on two random seeds, and a place without a retiree draws the next one (shown in the PR body with the seed and the places passed over).

**Files.** src/core2/residents.test.ts

**Notes.** Part of the remaining early returns listed on tests-early-returns-pass-without-checking (Oct 17). The other sites there (news, school, schools-by-era, market-entry, property-tax-laws, office-proof, office-day, law-reach, journal-state, finance-plan, jobs) are still to do.
