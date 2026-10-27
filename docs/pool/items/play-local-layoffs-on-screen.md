---
id: play-local-layoffs-on-screen
title: "News reports a local employer's layoffs and hiring, naming the employer"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from world-job-turnover-far-below-jolts)
lead: play-first
milestone: play-first
---

**What.** The jobs engine records hires, quits and layoffs, and world-job-turnover-far-below-jolts is raising them to real rates. The player sees none of it unless their own job changes. Print a local story when an employer in town lays off or hires several people in a month, naming the employer and the count, and list the town's open positions on Jobs and study, read from the job-change and position records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. Wire to the world: each story cites the job-change records it counts, by id. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, over a played half year, News shows at least one local layoff or hiring story whose employer and count match job-change record ids named in a test, and Jobs and study lists open positions by position id, shown by a screenshot with the place and seed named. The owner plays it: he sees it on News and Jobs and study in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** When a business in town lays people off or hires, the news says who and how many.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/story.ts, src/bench/jobs.ts, src/bench/play.mjs

**Notes.** Filed by the Oct 25 pool audit: world-job-turnover-far-below-jolts's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with world-job-turnover-far-below-jolts (needs-from in the handoff line).
