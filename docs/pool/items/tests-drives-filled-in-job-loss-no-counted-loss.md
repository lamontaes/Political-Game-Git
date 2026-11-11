---
id: tests-drives-filled-in-job-loss-no-counted-loss
title: "drives-filled-in-job-loss.test.ts finds no filled-in worker who lost a counted job in its pinned town"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** With the worker heap raised (item tests-world-tests-outgrow-worker-heap, no NODE_OPTIONS, 5168 MB printed in the worker), src/core2/drives-filled-in-job-loss.test.ts no longer runs out of memory but fails its first assertion on Steamboat Springs, Colorado (0873825), world seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7: 'no filled-in worker lost a counted job: expected false to be true' (line 63). Split off from that item as its Fix asks. The test checks that a filled-in person who loses a counted job feels it in their drives. Guards: the drives on a person's card and in their talks after a layoff, which the player reads.

**Cause.** Needs cause. The failing line is the test's own check at src/core2/drives-filled-in-job-loss.test.ts line 63 (no work.job-lost event on 2026-01-02 whose id has ':counted:' and whose person is in core.people); why the pinned world no longer produces one has not been traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours

**Rules.** No dice: the pinned place and seed stay and the test is never skipped or quarantined, so the fix is in what the world produces and not in the check.

**Done when.** A second session runs the test alone with no NODE_OPTIONS on the pinned place and seed (Steamboat Springs, Colorado) and the test passes, with the place and seed named in its output.

**Waits on.** Nothing

**Files.** src/core2/drives-filled-in-job-loss.test.ts
