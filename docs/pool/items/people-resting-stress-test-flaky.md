---
id: people-resting-stress-test-flaky
title: "resting-stress.test.ts fails in some places on main (no one out of work in Stephan, South Dakota; a gap over its bound in Guy, Arkansas)"
area: people
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/resting-stress-test
pr: #4908
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:27:31.384Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-17 from PR #4908 (branch claude/resting-stress-test): Morning check: resting-stress.test.ts widens the opening mean bound from 0.03 to 0.06 and the year bound from 0.06 to 0.08 based on the simulation outputs it is supposed to validate. Preserve the bounds and fix the cause, or derive a justified conditional expectation from independent calibration. Changing the comparison fixture to groups does not justify doubling the existing opening tolerance.; finish on that branch, merge main into it first.

Sent back 2026-10-19 from PR #4908 (branch claude/resting-stress-test): Morning check: src/core2/resting-stress.test.ts replaces the fixed <0.03 opening-mean error bound with (3 * normSd) / sqrt(n), which permits larger deviations for small samples. The merger rules refuse loosened tests; retain an equally strong calibration invariant; finish on that branch, merge main into it first.
