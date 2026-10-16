---
id: core-fill-in-returning-household-absent-member
title: "Filling in a person returned to the counts stops with Absent person when a household member is only counted"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #4762
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Filling in a person who was returned to the counts stops with "Absent person" when another member of their household is only counted and has no full record. The fill-in must build the household from the counts the same way a first fill-in does, so every member the household still has is present as a counted member or a full person. Find where the returning household is read in the residents module and make the fill-in create or reuse the missing member's record from the counts instead of throwing.

**Rules.** One model, two tiers: a counted member of a household is read with the same rule as a full person, times their count, so a filled-in person must match what the records already say. Replace, never layer: delete the failing path in place rather than catching the error beside it.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a person returned to the counts and filled in again opens with every household member present, named by person record id, and a test beside src/core2/residents.test.ts reproduces the stop first and then passes.

**Files.** src/core2/modules/residents.ts, src/core2/state.ts, src/core2/residents.test.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).

Sent back 2026-10-16 from PR #4762 (branch claude/fill-in-returning): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
