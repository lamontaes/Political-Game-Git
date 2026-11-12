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

**Cause.** Measured: Steamboat Springs, Colorado (0873825), world seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7, main cb0cf89f6e, with a probe on every `work.job-lost` event. The test's own way of finding the case is stale. The test counts a loss as a filled-in worker's counted job only when the event id contains `:counted:`. The event id is `event:work.job-lost:<date>:<job id>` (src/core2/modules/jobs.ts, the layoff in `shed`), and jobs are now work relationships. The only writer that puts `:counted:` in a job id is a demotion to the counts (src/core2/modules/counted-demotion.ts). In two played years no layoff carried it: 0 of 740 job losses to 2027-01-02, 17 of them naming a full person. Read the way the layoff itself decides the book, a counted-books job is one whose id (in `facts.jobChangeId`, `job-change:<date>:<job id>:layoff`) is not in `core.jobs`; a full-books job keeps its row with `endsAt`. Under that reading, through 2025-10-01 there were 263 job losses. 260 were jobs held only in the counted books, every one by a counted worker. 3 were held by full people, every one from the full books. So this world does not hold the case: no filled-in worker lost a counted-books job. The engine answered each case it met; a probe of the rest of the year was cut short by the machine's memory.

**Fix.** In src/core2/drives-filled-in-job-loss.test.ts, find the case by what it is, as the layoff decides it, in both tests: a full person (`core.people.has`) laid off from a job that is not in `core.jobs` (its id read from `facts.jobChangeId`). Replace the `:counted:` id test. Keep Steamboat Springs as the labeled first case, and wait in it a month at a time to a stated limit (2026-12-31). Then, per drawn-place-tests, draw places until one holds the case, naming every place passed over with the date reached and its counts of counted-books losses and full people's losses. Keep both assertions as they are: a filled-in worker's counted job loss is found, and every loss draws its worker's response once. If no place to the limit holds the case, the test fails by name with that list; that is then a finding about the engine (filled-in workers' jobs may be moved to the full books at fill-in, so the case may no longer arise), for the jobs lead.

**Time box.** 2 hours

**Rules.** No dice: the pinned place and seed stay and the test is never skipped or quarantined, so the fix is in what the world produces and not in the check.

**Done when.** A second session runs the test alone with no NODE_OPTIONS on the pinned place and seed (Steamboat Springs, Colorado) and the test passes, with the place and seed named in its output.

**Waits on.** Nothing

**Files.** src/core2/drives-filled-in-job-loss.test.ts

**Notes (Nov 12, R1).** Cause measured with a temporary probe, removed; nothing built. The case's rarity under the corrected reading is not yet known across places: the earlier "2 of 8 drawn places" in the test's comment was counted with the stale `:counted:` test.
