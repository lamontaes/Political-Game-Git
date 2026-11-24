---
id: lives-elsewhere-employers-counted
title: People living elsewhere and the county's sampled workers hold a job at a counted employer
area: core
kind: stopgap
priority: 2
size: L
status: open
standard: 2
claimed-by:
branch:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: high
root: rc1-world-outside-town
milestone: M7
source: stand-in triage Nov 10; stopgaps SG-LIVES-work-no-employer and SG-LIVES-county-sample-employers
---

**What.** Today a relative living elsewhere works, is let go and changes jobs with no employer named, and the county's sampled working adults carry only a sector group, so a county person the player clicks has no job, no wage and no payroll. Give both a counted employer: a row for each state's (and county's) employers by industry and size class, never named until someone is met, so a work spell names an employer and a filled-in worker holds a real job that matches the county's books. The rows are built when a spell is recorded or a person is clicked, not every day, so a year stays cheap. Seen: on a business's employee list and in the town's jobs figures a player opens.

**Cause.** Found in code: src/core2/jobs-elsewhere.ts, functions spellEvent and lostWork (stopgap SG-LIVES-work-no-employer, lines 263 and 279) record work with no employer; src/core2/opening-county-sample.ts, withCountySample (line 86), gives a household record instead of a job.

**Fix.** Build the employers as counted rows read by the existing regional engine (src/core2/modules/regional.ts), seeded from the County Business Patterns establishments the county sample already reads, with pay from the county's ACS earnings. A work spell, a layoff and a job change in jobs-elsewhere.ts name one of those rows; a county sample worker is assigned to a row; a fill-in turns the row into a named organization with a job and wage that match the counts. Do not make a second firms engine: the row is the same shape the jobs and business engines read for a counted group. Clear both register rows.

**Time box.** 8 hours for one Opus session; if the row shape needs a design choice across engines, stop after the shape and write it in Notes.

**Rules.** One model, two tiers. Wire to the world: a layoff elsewhere changes the row's headcount. No dice: employer choice follows industry, size and the place's conditions. Estimate, never UNKNOWN: pay starts from the county average with a per-world spread. Speed: built by counts monthly, never per person per day.

**Done when.** A second session, in a drawn place and seed it did not choose, plays one year of buildBenchWorld, opens a relative elsewhere who changed jobs and a county person who was filled in, and sees each name an employer row by record id with a wage that appears in the county's earnings; `npm run speed:year` stays within 20% of base.

**Waits on.** Nothing.

**Files.** src/core2/jobs-elsewhere.ts, src/core2/opening-county-sample.ts, src/core2/modules/regional.ts, src/core2/regional-model.ts, src/core2/data/stopgaps/lives.json
