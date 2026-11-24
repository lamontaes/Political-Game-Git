---
id: jobs-layoff-ends-an-office-seat
title: "A layoff can end an elected official's office seat: the jobs engine lays off a seat's own job as if it were staff"
area: jobs
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Board mock (lane 8), Nov 24, seen in the running game while proving #10531 (Clacks Canyon, Arizona, seed 10c17fc7-36e9-4a3d-9c2d-378ad77c6027)
after:
lead: jobs
model: sonnet
effort: medium
root: none
---

**What.** Dev mode's layoff of `person_8897b53b8949e312` (Steve Lynch) at Clacks Canyon, Arizona on 2025-01-21 ended `job:public:office:seat:gus2025:183707:board:0:person_8897b53b8949e312`, the job of his own board seat, and wrote `work.job-lost` for it. An elected official is not laid off from an office he was elected to; the seat ends by a term, a resignation or a recall, never by an employer's layoff.

**Cause.** Found in code: `layOffWorker` (src/core2/modules/jobs.ts) checks only that the job is on its organization's current staff (`currentJobs`), and a seat's own job (`job:public:office:<seat id>:<person>`, src/core2/person-work.ts `SEAT_JOBS`) is on its government's staff, so `layOff` picks it like any worker's. Any caller of `layOffWorker` (dev mode's layoff control, a business's own cuts that pass a job id) can end a seat this way.

**Fix.** `layOffWorker` refuses a seat's own job, as the person-work reader already tells it apart (`personWorkOf(core, id).job` is null for a seat job): return the refusal the callers already word (`null`, "Their job is not on a business's staff"), or a new `"seat"` answer with its own refusal. Check also that `layOff`'s own picks for a business's cuts never take a seat job.

**Time box.** 1 hour.

**Rules.** No dice; one rule, all 56 places.

**Done when.** A drawn-place test finds an officeholder whose seat job is on a government's staff and shows `layOffWorker` refuses it, and dev mode's layoff control on that person answers with the refusal instead of ending the seat.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts

**Notes.** Filed by Board mock (lane 8), Nov 24. #10531's dev default (the laid-off friend's call) now skips a seat job through `personWorkOf`, so it no longer reaches this; the engine still lays a seat off if asked.
