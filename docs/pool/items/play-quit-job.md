---
id: play-quit-job
title: "The player can leave their own job by pressing Leave this job"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: owner decision card, Nov 14 12:57Z ("Yes, add Leave this job")
---

**What.** The work and school scenes found no way for the player to leave a job on their own: it ended only by a layoff or a firing. A button on the Jobs tab, Leave this job, ends the job the player holds, through the same ending a worker's own leaving always takes. The pay stops and the employer opens the role again. Seen: on the Jobs tab, under the job's pay and hours.

**Cause.** Found in code: the jobs engine's monthly review (`reviewWorkers` in src/core2/modules/jobs.ts) writes a worker's own leaving (`api.endJob(job.id, "jobs:left-work:<date>")` and a `left-work` change) but skips the controlled person (`controlled(c, person.id)`), and no bench route reached the player's job (`src/bench/handler.ts` has no job route; `src/bench/play.mjs` `jobs()` only shows pay and hours). The director already reads that source as a job left (`chosenJobEnds` in src/director/data/director.json) and stages the coworkers' farewell (`last-day`, cause `money:job-left`).

**Fix.** In src/core2/modules/jobs.ts, move the leave branch into `leaveWork`, call it from the monthly review and from a new `quitJob` (with `jobLeaveBlock` saying why a job cannot be left: an office or appointed post, a business the player owns, a day already worked). Add `POST /api/job/leave` (src/bench/handler.ts, src/bench/openings.ts), `job.leave` on the person card (src/bench/card.ts) and the button with its two strings on the Jobs tab (src/bench/play.mjs, src/bench/data/controls.json).

**Time box.** 4 hours, one Sonnet session. When it runs out, push what passes and set the state honestly.

**Rules.** Nothing is cast for the player: the farewell scene is the game's own, after the player's press. Money moves only through the existing job and payroll records. No dice. Replace, never layer: the monthly leave and the player's leave share one function.

**Done when.** A second session, on main, in a drawn place from all 56 (named with its seed), takes a job offered by the jobs engine, works it, presses Leave this job on the Jobs tab, and sees: the job gone from the card, no shift worked after that day, the employer's staff one fewer and its need for the role one more, and the farewell with the former coworkers on the schedule (`money:job-left`, never `money:job-ended`). The pinned test src/core2/jobs-player-quits.test.ts passes.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/bench/handler.ts, src/bench/openings.ts, src/bench/card.ts, src/bench/play.mjs, src/bench/data/controls.json, src/core2/jobs-player-quits.test.ts

**Notes.** Words lines for the two new strings went to the Words lead with the played examples. Not built here: leaving a public post or an office (it resigns through the executive or offices engine), and an owner closing or selling their business.
