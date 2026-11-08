---
id: dev-mode-force-job-loss-through-layoff
title: "Dev mode can have a named worker's job end through the business's own layoff review"
area: play
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** jobs.ts layOff picks who goes inside the business's review, and no exported call lets a dev control ask a business to review its staff today. Dev mode's force-a-scene control needs a job-loss scene to follow from a layoff the game's code made. Add a call that runs the review for one named business, so the worker it picks, the record and the scene all come from the game's own path.

**Rules.** No dice: the business's own tenure and record values pick who goes, and the dev control only asks for the review.

**Done when.** In a drawn place, a dev control runs one business's layoff review, a work.job-lost record id appears for the worker the business chose, and the director stages the job-loss scene for that person; a test names the place and seed.

**Files.** src/core2/modules/jobs.ts, src/bench/dev-mode.ts

**Notes.** TODO
