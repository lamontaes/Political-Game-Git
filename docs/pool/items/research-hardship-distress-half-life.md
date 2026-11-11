---
id: research-hardship-distress-half-life
title: "How long the distress of a job loss or an eviction lasts, so coping choices weeks later still feel it"
area: people
kind: research
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: none
lead: traits
after:
checked: fable 2026-11-10
---

**What.** Stress wears off at stressHalfLifeDays, now ESTIMATED at 1 day from a daily-diary study of everyday stressors (Bolger and others 1989) with a spread of half a day to a week. Coping choices (a claim, a loan, leaving town) read the stress a layoff, eviction or missed payment left (pool item traits-outcome-hardship-coping), but loan and move reviews run monthly and cash shortfalls come months after a layoff, so the read is near zero by then: in eight played years, 21 loans were weighed under hardship stress and one departure carried it. Find a sourced half-life for job-loss and eviction distress (for example panel studies of distress after displacement), which is a different thing from a daily hassle, and give hardship its own half-life if the source differs.

**Cause.** Found in code: stressHalfLifeDays in src/core2/data/parameters.json (value 1, ESTIMATED from a daily-stressor study) drives the decay in src/core2/emotion.ts (`numeric(params, "stressHalfLifeDays")` at line 145); the traits lead measured in eight played years that 21 loans were weighed under hardship stress and one departure carried it.

**Fix.** Find a sourced half-life for job-loss and eviction distress, set it as a hardship-specific parameter tagged SOURCED or ESTIMATED with a quoted study and spread, and make src/core2/emotion.ts decay hardship stress with it. Show in a played year the coping decisions reading stress weeks after the event.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: quote the fetched page; the value calibrates stress decay and never decides an outcome. No dice: a coping decision reads the stress record and the person's traits and money, never a drawn chance. Every number lives in a parameter table with its tag.

**Done when.** A second session plays a year in a drawn place (place and seed named in the PR) and sees a layoff or eviction leave hardship stress that a loan or move review weeks later still reads, by record id, with the half-life tagged SOURCED or ESTIMATED with a quoted study in src/core2/data/parameters.json.

**Waits on.** Nothing.

**Files.** src/core2/data/parameters.json, src/core2/emotion.ts

**Notes.** Filed Oct 24 by the traits lead from the hardship-coping helper's played years.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sourced how long a layoff's distress lasts; the number may stay an estimate with its spread.
