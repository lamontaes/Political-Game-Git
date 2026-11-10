---
id: labor-regional-job-priced-from-own-occupation
title: "A resident out of work who finds a job outside town is paid for the kind of work they did, not the kind of the nearest town role"
area: core
kind: stopgap
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: jobs
standard: 2
model: sonnet
effort: medium
root: none
source: stand-in triage of labor.json, Nov 10, 2026 (SG-LABOR-regional-job-town-roles)
---

**What.** When a town resident out of work finds a job in the wider region, the pay comes from the federal wage survey for the occupation of the town's role nearest to what they were paid, not the occupation of their own last job. A cashier who was laid off from a hardware store can be priced as whatever town role paid closest to her. Close stand-in SG-LABOR-regional-job-town-roles by pricing from the person's own last occupation.

**Cause.** Found in code: `hireRegional` in src/core2/modules/jobs.ts (line 2496 to 2510). `const occupation = template?.occupationClassification ?? seeker.lastJob?.occupationClassification;` takes the town role's occupation first and the person's own `lastJob` only when the town has no role to copy. The seeker row already keeps `lastJob` (SeekerRow, line 184; set at lines 1933, 4042 and 4959).

**Fix.** In `hireRegional`, put the seeker's own `lastJob.occupationClassification` first and the template's second, so the wage comes from the person's own kind of work. Keep the template for the role and employer record only. Leave the fallback to the town's nearest role for a seeker with no last job or an occupation the survey does not cover, and keep the stopgap marker on that fallback only; rewrite the row's whatItFakes to say so. Cost stays the same: one table lookup per hire.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice: pay follows the person's own recorded job. Estimate, never UNKNOWN: a missing occupation falls back to the nearest town role and the record says so. One model, two tiers: a counted seeker is read by the same rule as a full person.

**Done when.** A second session runs a 24-month world with scripts/world-proofs/jobs-24-months.ts in a drawn place and a seed nobody chose (both named), picks three residents who found regional jobs, and sees each one's regional pay equal the survey wage for the occupation on their own last job record (named by record id), not for the nearest town role's occupation. The labor.json row is rewritten to the remaining fallback only.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps/labor.json, scripts/world-proofs/jobs-24-months.ts
