---
id: people-cohort-name-share-measured
title: "The share of people who take a birth-year cohort name is measured, not authored at 0.6"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `COHORT_GIVEN_NAME_SHARE` in `src/core2/gov-rules/given-name-cohorts.ts` is 0.6: only that share of generated people take a name drawn from their birth year's top 100; the rest keep the ordinary draw's name. The comment on it says the value is authored, not measured. The real share is how many births in a decade the top 100 names account for, which differs by decade and sex, and the SSA decade pages publish it. Replace the one number with a per-decade, per-sex share from those pages, in the data file beside the name tables, with its citation.

**Rules.** Research before building: real data checks the simulation and never picks one person's name; the share is a rate applied by the existing seeded generation of who exists, which the rules allow. Every number lives in the parameter table or a sourced data file, tagged SOURCED with its citation. One rule, all 56 places: the share is data keyed by decade and sex, not by place.

**Done when.** The share is read per decade and sex from a sourced file, the 0.6 constant is gone, and in a drawn place's opening (name and seed in the PR body) the fraction of people with a cohort name falls within the published share's range for their decade and sex, checked by a test. The opening's names change, so the PR body states how many of a drawn place's people got a different name and why.

**Files.** src/core2/gov-rules/given-name-cohorts.ts, src/core2/data/names/given-names-by-decade.json

**Notes.** Found 2026-10-16 while porting the name draw into core (people-port-names, PR #4638), which carried the constant over unchanged so names would stay identical. The Social Security Administration publishes the decade pages at ssa.gov; the working environment could not reach it when the table was first built.
