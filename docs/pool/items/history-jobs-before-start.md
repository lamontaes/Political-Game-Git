---
id: history-jobs-before-start
title: "Jobs have a simulated past: who worked, who looked and which positions were open before day one, so Metrics shows last year's town jobs on the first day"
area: jobs
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: history-housing-before-start
blocked-on:
lead: jobs
model: opus
effort: medium
root: design-one-model-two-tiers
checked: Account lead 2026-11-14
source: owner in chat Nov 13 2026 23:51Z (the past is simulated so the present makes sense); finding by Account lead T15, Nov 13
---

**What.** On day one the town's jobs rows on Metrics (people at work, people looking, open jobs) show no last year: nothing before the start says who was employed, who was looking or which positions were open. Seen: Metrics on day one, the town's jobs rows each with last year beside them.

**Cause.** Found in code: the business history pass writes only founding dates and past owners (src/core2/modules/business.ts `businessHistory`, src/core2/past-business.ts); a worker holds a start date for today's job only (src/core2/opening-employment.ts); seekers and open positions exist only for today (src/core2/modules/jobs.ts, the opening's seekers and positions). The work pass (src/core2/past-work.ts) dates full people's jobs but nothing counts the town.

**Fix.** A jobs pre-start pass beside housing's (src/core2/housing-past.ts is the pattern): from the work pass's spells and the business pass's foundings, count the town's employed, seekers and open positions at each coarse step and each December, keep them as history rows, and write the registry's year rows with `putPastYear` (src/core2/output-numbers.ts) unchanged. Do not edit `townEmployed` or `townSeekers` (another builder owns them); read the registry's rows.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** History is simulated before the start (owner, Oct 27, Oct 28, Nov 13); real data calibrates only. One rule for both tiers. No added work in the played year.

**Done when.** A second session starts a new life in a drawn place, naming place and seed, and sees last year beside the town's jobs rows on Metrics on day one, each traceable in dev mode to the pass's December record.

**Files.** src/core2/modules/jobs.ts, src/core2/past-work.ts, src/core2/output-numbers.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.
