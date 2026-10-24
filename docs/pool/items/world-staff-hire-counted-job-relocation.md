---
id: world-staff-hire-counted-job-relocation
title: "Hiring an official's staff from the counted population throws an invalid relocation"
area: world
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/staff-hire-counted-relocation
pr: #5929
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T15:55:24.635Z
---

**What.** In a played world with no law changed, an official's staff review hires a counted resident and the fill-in throws: staffReview calls hireStaff, which calls fillInPerson, and state.ts:1542 throws 'Invalid relocation: one living household, no job held'. The taxes helper reproduced it in Audubon Park, Kentucky (drawPlace 'law-wiring-taxes:0', seed taxes-oct24-fixed) on 2026-01-15. A throw in the daily loop stops the year for anyone playing that town, so it blocks play, not only the test.

**Rules.** One model, two tiers: a counted resident filled in to take a staff job must match what the records say about their household and job, and the same hire rule applies to named and counted candidates; one rule, all 56 places: the fix may not skip the town or the hire.

**Done when.** A buildBenchWorld year in Audubon Park, Kentucky with seed taxes-oct24-fixed runs past 2026-01-15 without a throw, and the staff hire names the filled-in person and their job by id; a test reproduces the throw before the fix and passes after, and passes on two fresh random seeds named in the PR body.

**Files.** src/core2/state.ts, src/core2/modules/staff.ts

**Notes.** TODO

Sent back 2026-10-24 from PR #5929 (branch claude/staff-hire-counted-relocation): health-demoted.test.ts:120 can return before personOrFillIn and all returned-household assertions, allowing the crash-path regression to pass unexercised; require a mandatory living-household fill-in case; finish on that branch, merge main into it first.
