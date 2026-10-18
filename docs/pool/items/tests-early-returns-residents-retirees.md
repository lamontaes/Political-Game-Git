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

**What.** Eleven tests in `src/core2/residents.test.ts`, `news.test.ts`, `campaign-day.test.ts`, `leadership.test.ts`, `law-reach-group-a.test.ts`, `law-reach-group-b.test.ts`, `executive.test.ts`, `opening-story.test.ts` and `bench/world-modules.test.ts` ended with a bare `return` when the drawn place lacked the case they check, so they passed without checking anything: a payday whose whole period came before the opening, a filled-in counted retiree paid their own income, retirees paid at the benefit level in force, and a worker who retires at that level, a county's story reaching its residents, the interview a campaign day offers, a chamber's chair with caucuses, a council member's term limit, and a closed private school's eligibility rows. The governor's order test, the press wire test and the module install test assert what the file already guarantees (the three states allow the order, the played world installs the press, an exempt module has nothing to install). The news test now asserts the reason where the place has no county government (the data names none); the others draw further places. Draw further places until one has the case and fail by name, listing the places passed over, when none does.

**Rules.** A test reaches an applicable case or fails clearly; it never passes empty. One rule, all 56 places: the draw is from all 56 and names place and seed. No assertion is loosened or dropped.

**Done when.** The grep for bare early returns finds none of those lines in the nine files, the file passes on two random seeds, and a place without a retiree draws the next one (shown in the PR body with the seed and the places passed over).

**Files.** src/core2/residents.test.ts, src/core2/news.test.ts, src/core2/campaign-day.test.ts, src/core2/leadership.test.ts, src/core2/law-reach-group-a.test.ts, src/core2/law-reach-group-b.test.ts, src/core2/executive.test.ts, src/director/opening-story.test.ts, src/bench/world-modules.test.ts

**Notes.** Part of the remaining early returns listed on tests-early-returns-pass-without-checking (Oct 17). The other sites there (the law reach tests' world is now chosen with the case in hand; school, schools-by-era, market-entry, property-tax-laws, office-proof, office-day, law-reach, journal-state, finance-plan, jobs) are still to do.
