---
id: history-jobs-before-start
title: "Jobs have a simulated past: who worked, who looked and which positions were open before day one, so Metrics shows last year's town jobs on the first day"
area: world
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

**What.** On day one the town's jobs rows on Metrics (people at work, people looking, open jobs) show no last year. Nothing before the start says who was employed, who was looking or which positions were open a year ago, so the year row the registry reads does not exist. Seen: Metrics on day one, the town's jobs rows each with last year beside them.

**Cause.** Found in code: the business history pass writes only founding dates and past owners (src/core2/modules/business.ts `businessHistory`, src/core2/past-business.ts); a worker holds a start date for today's job only (src/core2/opening-employment.ts); seekers and open positions exist only for today (src/core2/modules/jobs.ts, the opening's seekers and positions). The work pass (src/core2/past-work.ts) dates full people's jobs but nothing counts the town.

**Fix.** A jobs pre-start pass beside housing's (src/core2/housing-past.ts is the pattern): from the work pass's spells and the business pass's foundings, count the town's employed, seekers and open positions at each coarse step and each December, keep them as history rows, and write the registry's year rows with `putPastYear` (src/core2/output-numbers.ts) unchanged. Do not edit `townEmployed` or `townSeekers` (another builder owns them); read the registry's rows.

**Time box.** 6 hours for one Opus session at medium effort.

**Rules.** History is simulated before the start (owner, Oct 27, Oct 28, Nov 13): the jobs engine's own rules run the coarse years, and real data only calibrates them. One model, two tiers: a counted worker or seeker counts by its household's weight, the same rule the jobs engine uses. Speed: the pass runs once at the opening, and nothing is added to the played year.

**Done when.** A second session starts a new life in a drawn place, naming place and seed, and sees last year beside the town's jobs rows on Metrics on day one, each traceable in dev mode to the pass's December record.

**Waits on.** history-housing-before-start (its `putPastYear`).

**Files.** src/core2/modules/jobs.ts, src/core2/past-work.ts, src/core2/output-numbers.ts

**Notes.** Filed by Account lead T45 on its branch at the Account lead's request.

Nov 14, 2026 (Account lead T49): the home price level before day one reads the economy's pay, not the town's (SG-WORLD-housing-price-past-pressure and the town-pay note in src/core2/housing-price-level.ts). When this pass keeps each town's pay by month before the start, the price path in src/core2/housing-price-path.ts can read it per place.
