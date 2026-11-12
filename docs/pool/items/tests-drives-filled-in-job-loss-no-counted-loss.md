---
id: tests-drives-filled-in-job-loss-no-counted-loss
title: "drives-filled-in-job-loss.test.ts finds no filled-in worker who lost a counted job in its pinned town"
area: core
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: R1 (Fable A's builder)
pr: #8889
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
merged-at: 2026-11-12T17:23:44.955Z
---

**What.** With the worker heap raised (item tests-world-tests-outgrow-worker-heap, no NODE_OPTIONS, 5168 MB printed in the worker), src/core2/drives-filled-in-job-loss.test.ts no longer runs out of memory but fails its first assertion on Steamboat Springs, Colorado (0873825), world seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7: 'no filled-in worker lost a counted job: expected false to be true' (line 63). Split off from that item as its Fix asks. The test checks that a filled-in person who loses a counted job feels it in their drives. Guards: the drives on a person's card and in their talks after a layoff, which the player reads.

**Cause.** Measured: Steamboat Springs, Colorado (0873825), world seed 2fed679e253cf36aec36b937cf2d408b729b11e382abb5ea7600a670f788f4d7, main cb0cf89f6e, with a probe on every `work.job-lost` event. The test's own way of finding the case is stale. The test counts a loss as a filled-in worker's counted job only when the event id contains `:counted:`. The event id is `event:work.job-lost:<date>:<job id>` (src/core2/modules/jobs.ts, the layoff in `shed`), and jobs are now work relationships. The only writer that puts `:counted:` in a job id is a demotion to the counts (src/core2/modules/counted-demotion.ts). In two played years no layoff carried it: 0 of 740 job losses to 2027-01-02, 17 of them naming a full person. Read the way the layoff itself decides the book, a counted-books job is one whose id (in `facts.jobChangeId`, `job-change:<date>:<job id>:layoff`) is not in `core.jobs`; a full-books job keeps its row with `endsAt`. Under that reading, through 2025-10-01 there were 263 job losses. 260 were jobs held only in the counted books, every one by a counted worker. 3 were held by full people, every one from the full books. So this world does not hold the case: no filled-in worker lost a counted-books job. The engine answered each case it met; a probe of the rest of the year was cut short by the machine's memory.

**Fix.** Built. src/core2/drives-filled-in-job-loss.test.ts finds the case the way the engines keep it. Filling a worker in moves their counted job into `core.jobs` under the same id (src/core2/state.ts, the fill-in). So a filled-in worker's counted job loss is a job lost by a full person whose id was once in the counted books (the residents engine's `jobs`, read at the opening and every month). The first test plays Steamboat Springs a month at a time to 2026-01-02 until it holds the case. It then draws up to three places, names every place passed over, and fails by name if none holds the case. Both assertions are unchanged: a filled-in worker's counted job loss is found, and every job loss draws its worker's response once.

**Time box.** 2 hours

**Rules.** No dice: the pinned place and seed stay and the test is never skipped or quarantined, so the fix is in what the world produces and not in the check.

**Done when.** A second session runs the test alone with no NODE_OPTIONS on the pinned place and seed (Steamboat Springs, Colorado) and the test passes, with the place and seed named in its output.

**Waits on.** Nothing

**Files.** src/core2/drives-filled-in-job-loss.test.ts

**Notes (Nov 12, R1).** Cause measured with a temporary probe, removed; nothing built. The case's rarity under the corrected reading is not yet known across places: the earlier "2 of 8 drawn places" in the test's comment was counted with the stale `:counted:` test.

**Notes (Nov 12, R1, built).** Under the engines' reading the pinned world holds the case. On 2026-01-01, event:work.job-lost:2026-01-01:work-relationship_bde1cc4e296e90dd ended the job of filled-in worker person_e99b232f8fee5d29, and it was answered once. Layoffs by tier over six months in five places, to settle "one model, two tiers": filled-in workers were laid off in 3 of 5 places (Greenville OK 1 of 28, Puhi HI 1 of about 45, Chalan Kanoa III MP 1 of 42; Steamboat Springs 0 of about 65; Christiansted VI 0 of about 35). Counted-books jobs were laid off at 5 to 8 percent (for example Steamboat Springs 179 of about 2,650). The full people present at the opening were laid off at about 0.5 percent (3 or 4 of 620 to 790 in each place). That last gap is an open question for the jobs lead, not settled here.
