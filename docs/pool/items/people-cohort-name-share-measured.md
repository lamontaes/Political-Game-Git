---
id: people-cohort-name-share-measured
title: "The share of people who take a birth-year cohort name is measured, not authored at 0.6"
area: people
kind: research
priority: 3
size: S
status: done
claimed-by: claude/cohort-name-share
pr: #5082
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:24:54.224Z
---

**What.** `COHORT_GIVEN_NAME_SHARE` in `src/core2/gov-rules/given-name-cohorts.ts` is 0.6: only that share of generated people take a name drawn from their birth year's top 100; the rest keep the ordinary draw's name. The comment on it says the value is authored, not measured. The real share is how many births in a decade the top 100 names account for, which differs by decade and sex, and the SSA decade pages publish it. Replace the one number with a per-decade, per-sex share from those pages, in the data file beside the name tables, with its citation.

**Rules.** Research before building: real data checks the simulation and never picks one person's name; the share is a rate applied by the existing seeded generation of who exists, which the rules allow. Every number lives in the parameter table or a sourced data file, tagged SOURCED with its citation. One rule, all 56 places: the share is data keyed by decade and sex, not by place.

**Done when.** The share is read per decade and sex from a sourced file, the 0.6 constant is gone, and in a drawn place's opening (name and seed in the PR body) the fraction of people with a cohort name falls within the published share's range for their decade and sex, checked by a test. The opening's names change, so the PR body states how many of a drawn place's people got a different name and why.

**Files.** src/core2/gov-rules/given-name-cohorts.ts, src/core2/data/names/given-names-by-decade.json

**Notes.** Found 2026-10-16 while porting the name draw into core (people-port-names, PR #4638), which carried the constant over unchanged so names would stay identical. The Social Security Administration publishes the decade pages at ssa.gov; the working environment could not reach it when the table was first built.

Tried Oct 17 (claude session), not built: `https://www.ssa.gov/oact/babynames/decades/names1980s.html` returns HTTP 403 to the web fetch tool in this environment, so the decade pages cannot be read here. The share per decade and sex is the sum of a decade's top-100 counts divided by that decade's births by sex (`numberUSbirths.html`); either source works for a session that can reach ssa.gov, or from the SSA's national-names zip (names by year) if a mirror is allowed.

Oct 19 (claude/cohort-name-share): built. Share read per decade and sex from src/core2/data/names/given-name-top-share.json (numerator: SSA decade top-100 counts already in the repo; denominator: SSA applicants by year and sex from the babynames package, because ssa.gov returns 403 here). The 2010s denominator is a yearly mean times ten (data ends 2017) and the 2020s hold the 2010s share, both marked ESTIMATED in the file.
