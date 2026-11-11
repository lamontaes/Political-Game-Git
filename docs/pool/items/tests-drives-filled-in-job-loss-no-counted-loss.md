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
effort: low
root: none
source: added with npm run pool -- add
---

**What.** With the worker heap raised (item tests-world-tests-outgrow-worker-heap, no NODE_OPTIONS, 5168 MB printed in the worker), src/core2/drives-filled-in-job-loss.test.ts no longer runs out of memory but fails its first assertion on Steamboat Springs, Colorado (0873825), world seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7: 'no filled-in worker lost a counted job: expected false to be true' (line 63). Split off from that item as its Fix asks. The test checks that a filled-in person who loses a counted job feels it in their drives. Guards: the drives on a person's card and in their talks after a layoff, which the player reads.

**Cause.** Found in code: the test (src/core2/drives-filled-in-job-loss.test.ts line 56) recognizes a counted job by `event.id.includes(":counted:")`, but a layoff's event id is `event:work.job-lost:<date>:<job id>` (src/core2/modules/jobs.ts line 1892) and every job id is now a work relationship (`work-relationship_<id>`), counted or full, as the test's own header says ('job ids are work relationships'). So the marker can never match. Measured on main 9ebd554b with the pinned world (Steamboat Springs, Colorado, 0873825, seed 2fed679e…), a working copy of the test logging every job loss to 2026-01-02 (undone after): 342 job losses, 6 naming a full person, 0 with `:counted:` in the id. Whether a job lived in the counted books is known only inside the layoff (`c.jobs.has(job.id)`, jobs.ts line 1861) and is not written on the event.

**Fix.** 1. In src/core2/modules/jobs.ts, in the layoff before `api.endJob` / `endCountedJob` (line 1861), read `const countedJob = !c.jobs.has(job.id)` and add `...(countedJob ? { "counted-job": 1 } : {})` to the event's `facts`. src/core2/jobs-elsewhere.ts `lostWork` (line 287) needs nothing: it ends only a full person's work outside the town. 2. In the test, mark a loss as filled-in when the event names a full person (`event.personIds[0]` in `core.people`) and `event.facts["counted-job"] === 1`, instead of the id substring. 3. If the pinned world still has no such loss by 2026-01-02, keep the place and play on until one occurs (up to a year, logging the date found), as the drawn-place-tests skill says; the second case already draws three places.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the pinned place and seed stay and the test is never skipped or quarantined. Ask why: the check reads what the layoff recorded, not a shape of an id. Wire to the world: the fact is written by the layoff itself, the one place that knows where the job lived.

**Done when.** A second session runs the test alone with no NODE_OPTIONS on the pinned place and seed (Steamboat Springs, Colorado) and the test passes, with the place and seed named in its output.

**Waits on.** Nothing

**Files.** src/core2/drives-filled-in-job-loss.test.ts, src/core2/modules/jobs.ts

**Notes.** Cause found (Nov 11, 2026, cause finder for Fable B): the pinned world's 342 job losses by 2026-01-02 carry work-relationship ids with no `:counted:` in any of them; the test's marker dates from when counted jobs had their own id shape.
