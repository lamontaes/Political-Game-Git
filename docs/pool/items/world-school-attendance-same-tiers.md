---
id: world-school-attendance-same-tiers
title: "School standing attendance uses the same basis in both tiers"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5639
blocked-on:
source: added with npm run pool -- add
claimed-at: 
---

**What.** PR #5639 substitutes all full students average attendance for every counted student, and defaults that average to 1. The new shortcut is not registered. Its comment calls the average local to the student's place, but the calculation pools full students across places, so meeting someone can change the attendance basis their school standing reads.

**Rules.** One model, two tiers; every behavioral shortcut needs its exact stopgap row and code marker.

**Done when.** School standing uses the same recorded attendance rule for full and counted students, or the exact bounded shortcut is registered and marked. A drawn-place regression checks a positive attendance difference and the intended fill-in behavior. The PR Done-when table describes the current tests and observed results.

**Files.** src/core2/school-outcomes.ts, src/core2/school-outcomes.test.ts, src/core2/data/stopgaps.json

**Notes.** Sent back 2026-10-24 from PR #5639 (branch effect-web-integration): school-outcomes.ts:140-173 uses a global full-student attendance mean for counted students without a registered stopgap; finish on that branch, merge main into it first.
