# WEEKEND19 E — ordinary work simplification

Authority: WEEKEND19 shared contract plus section E
(`1O6IO1lbbycHfRBW4yu3Mcgu24ZYdTegdg2kBLXMnPLg`) and CAREER/EDU sections 9–10
(`1Nby3elNIDfrTqxjky2XS-yGBzIWRJvUbrLpBTZezUcA`).

Base: `origin/main` `67e9d3409a71fab623e5ceefce3dc7372f082121`. No unpublished
ordinary-job-removal branch, PR, or cloud-agent tree was found; this is a fresh
isolated implementation.

## Slice A1

Remove the mandatory 10–2,000-character work submission and per-shift task
selector. `performCareerWork` / `performLifePathWork` record a completed shift
without invented deliverable prose. Historical `completeCareerTask` text still
decodes. Optional colleague scenes are unchanged; no cover-shift rota is added.

## Slice A2

`RoutineTimeHook` on the existing future-transition registry. Fast-forward
completes authored personal work windows once as time crosses them, with
conflict/interrupt/partial-day/long-vs-short skip coverage.

## Out of scope

Profession simulator, salary/tax/debt engine, automating votes or speeches,
education term progression (F), PlayerGame root rewrite (A).
