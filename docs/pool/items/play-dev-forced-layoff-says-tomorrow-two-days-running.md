---
id: play-dev-forced-layoff-says-tomorrow-two-days-running
title: "Dev mode's forced layoff answered 'They worked today: lay them off tomorrow' two days running before it worked on the third (San Roque, Northern Mariana Islands)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-dev-forced-layoff-says-tomorrow-two-days-running
pr: #8585
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, What the code does)
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:47:36.728Z
---

**What.** With Dev mode on, a person's card has a button that ends their job through their employer's own layoff ("Laid off by their employer"). Measured by the Nov 9 audit in San Roque, Northern Mariana Islands (no seed given): a forced layoff answered "They worked today: lay them off tomorrow" on two days running before it worked on the third. The control told the tester to come back tomorrow, and tomorrow it said the same thing. Fix it for every worker and every kind of employer: one press is enough. When the worker has already worked today, the control books the layoff with the employer for the worker's next day, before their shift, through the engine's own layoff, and says once which day it will happen; nothing asks the tester to try again.

**Cause.** Found in code: `forceLayoff` in src/bench/dev-mode.ts (line 1231) turns the jobs engine's `layOffWorker` answer "worked-today" (src/core2/modules/jobs.ts, line 4816) into 'They worked today: lay them off tomorrow' (line 1239) and books nothing; the engine's own note says the same choice is made the next day, but nothing carries it there. Measured by the Nov 9 audit in San Roque, Northern Mariana Islands (no seed), two refusals before it worked. The refusal exists for a real reason (ending a job after its holder worked that day stopped the game before), which the fix keeps.

**Fix.** When the worker has worked today, book the layoff with the employer for the worker's next day before their shift through the engine's own layoff, say once which day it will happen, and never ask the tester to press again. The forced scene whose way in is a layoff (`forceScene`) reads the same path.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the forced layoff must end the job through the employer's own separation, so the reason record, the job-lost event, the state claim and the news follow as for any layoff, on the day the control names. No dice: the booked layoff is the same named pick the control makes today, carried to the next day, never a chance. Owner, Nov 8, 12:50 a.m.: "Making it happen should just trigger the code in the game that makes it happen."

**Done when.** A second session starts the bench (`npm run bench`, `/play`), leaves the Place field empty so the place is drawn, writes down the place and seed the title shows, and turns Dev mode on in Options. It opens the card of a person who holds a job at a business and presses "Laid off by their employer" once, after that person's shift has started (the Run panel's Jump to hour, set to Evening). Either the job ends at once, or the result line names the day it will end. It runs one day from the Calendar and opens the card again: the person has no job, and the Records section holds a job-lost record whose Trace names the employer, by record id. It never has to press the button twice, and the sentence "lay them off tomorrow" never appears twice for one worker. It does this for three workers, after a jump to Morning, to Midday and to Evening, and saves a screenshot of each result line with the place and seed under it. It then repeats in San Roque, Northern Mariana Islands (the audit's place; no seed was given, so the seed drawn is written down). `src/bench/dev-layoff.test.ts`, in a drawn place with its seed named, forces a layoff on a worker who has worked today, advances one day with no second call, asserts the job has ended and the job-lost record exists, and fails when the fix is undone. The owner plays it: with Dev mode on he presses the layoff button on someone's card once, and by the next day they are out of work with the reason on their record.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/ui/dev-person.mjs, src/bench/data/controls.json, src/core2/modules/jobs.ts, src/bench/dev-layoff.test.ts, src/bench/dev-api.ts

**Notes.** From the Fable audit of Nov 9, 2026, Pillar 2, "What the code does", the run-until bullet: "A forced layoff answered 'They worked today: lay them off tomorrow' on two days running before it worked on the third." It was measured in the lead's own dev-mode session in San Roque, Northern Mariana Islands; the audit gives no seed and does not say whose job it was, what hour the presses were made, or whether the scene that should follow a layoff then played. The cause lines above were read on Nov 10 by the session that filed this; the audit named no cause. The same refusal also reaches the Scenes panel: a scene whose way in is a layoff (`forceScene`, `src/bench/dev-mode.ts`, line 1087) fails with the same sentence. The refusal exists for a real reason, kept by the fix: ending a job after its holder worked that day stopped the game before (`jobs-layoff-worked-today`, `core-office-job-ends-before-days-work`, `play-staff-hire-worked-today-stops-clock`, all done). Related items found: `dev-mode-force-job-loss-through-layoff` (open, priority 3; it asks for the control this item repairs, and the control now exists as `layOffWorker`, so its claimer should read this item first), `play-dev-scene-list-does-not-say-what-it-can-cause`. No open item covered this defect.
