---
id: jobs-let-go-weights-sourced
title: "The three weights in an employer's keep review are working values, not yet fitted to the published record of who is let go"
area: world
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: jobs-employer-keep-review-replaces-national-layoff-pace
blocked-on:
root: design-country-tier
lead: jobs
model: sonnet
effort: medium
source: Labor lane, Nov 17, 2026, family 19 of the pins (crew line #9747)
---

**What.** An employer's monthly review of a worker weighs their tenure and record, how far the business is over its sales, and its months of loss. How strongly each one counts was set by hand when the review was built. A town's job losses then follow the right causes at strengths nobody has checked against real firms.
Seen: who loses a job in town, and how fast a shrinking business sheds staff.

**Cause.** Found in code: `letGoScore` (src/core2/modules/jobs.ts) reads `jobsLetGoValueWeight` 1, `jobsLetGoStaffOverWeight` 8 and `jobsLetGoLossWeight` 1.5 from src/core2/data/jobs/parameters.json, each tagged TUNABLE with a working range and no fetched source.

**Fix.** Fetch and quote the layoff rate by establishment growth (Davis, Faberman and Haltiwanger 2012, the layoff curve against employment growth) and the job-ending hazard by tenure (Farber 1999, or BLS tenure tables). Set each weight so `letGoScore` reproduces those curves when given the published inputs, write the quoted figures and the spread into the three rows, and tag them SOURCED or ESTIMATED. Change no test's assertion. The player sees it as how quickly a failing shop lets people go.

**Time box.** 4 hours for one Sonnet session at medium effort. When it runs out, push what is quoted and fitted, set the state honestly with a one-line note and stop.

**Rules.** Research before building: the published curves set how strongly a cause moves the pull and never a town's count. No dice: no rate picks which worker is let go.

**Done when.** The three rows carry quoted figures with their pages and a measured spread, `src/core2/employer-keep-review.test.ts` passes unchanged, and a second session, on main in a drawn place it names with its seed, runs `scripts/world-proofs/jobs-24-months.ts` for 24 months and sees both flows in most months.

**Waits on.** jobs-employer-keep-review-replaces-national-layoff-pace.

**Files.** src/core2/data/jobs/parameters.json, src/core2/modules/jobs.ts
