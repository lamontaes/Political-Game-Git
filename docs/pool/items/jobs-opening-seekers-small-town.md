---
id: jobs-opening-seekers-small-town
title: "Finish the opening-seekers redraw test with measured timeout evidence"
area: core
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #5814
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** Complete the existing test fix on claude/opening-seekers-small-town. Legitimately empty counted-seeker towns should not fail an assertion that requires a nonempty subject.

**Rules.** Do not narrow assertions or raise a timeout without measured evidence. Keep an independent draw from all 56 places and require a nonempty checked subject.

**Done when.** The changed opening-seekers tests pass in drawn generated worlds with place and seed named; the timeout bound is backed by measured timings; the PR body maps this acceptance to its evidence in the Done when table.

**Files.** src/core2/jobs-opening-seekers.test.ts

**Notes.** Sent back 2026-10-23 from PR #5814 (branch claude/opening-seekers-small-town): timeout rises from 600000 to 1800000 ms without measured evidence, and the body lacks a bounded pool item and evidence table; finish on that branch, merge main into it first.
