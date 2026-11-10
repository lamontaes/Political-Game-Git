---
id: play-local-layoffs-on-screen
title: "News reports a local employer's layoffs and hiring, naming the employer"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-job-turnover-far-below-jolts)
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: fable 2026-11-10
---

**What.** The jobs engine records hires, quits and layoffs, and world-job-turnover-far-below-jolts is raising them to real rates. The player sees none of it unless their own job changes. Print a local news story when an employer in town lays off or hires several people in a month, naming the employer and the count, each story citing the job-change records it counts. The list of open positions is not part of this item: it is play-job-openings-on-screen.

**Cause.** Design: docs/play-first/LAW.md section 11 (the world on screen makes sense); the job-change records of src/core2/modules/jobs.ts are read by no news story, and src/bench/story.ts has no layoff or hiring line. The old src/bench/jobs.ts is gone.

**Fix.** Print a local news story when an employer in town lays off or hires several people in a month, naming the employer and count, each citing the job-change record ids; when nothing happened, print nothing false.

**Time box.** 3 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Serves LAW.md section 11. Wire to the world: each story cites the job-change records it counts, by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** A second session, in a drawn place on the bench over a played half year, sees News show at least one local layoff or hiring story whose employer and count match job-change record ids named in a test, shown by a screenshot with the place and seed named. The owner sees it on News in his own game without opening dev mode.

**Waits on.** world-job-turnover-far-below-jolts (open) for layoffs and hires to happen at real volume.

**Files.** src/bench/story.ts, src/bench/play.mjs, src/core2/modules/jobs.ts

**You will see.** When a business in town lays people off or hires, the news says who and how many.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Notes.** Filed by the Oct 25 pool audit: world-job-turnover-far-below-jolts's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-job-turnover-far-below-jolts (needs-from in the handoff line).
