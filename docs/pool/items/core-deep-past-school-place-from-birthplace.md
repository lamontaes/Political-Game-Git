---
id: core-deep-past-school-place-from-birthplace
title: "Where the deep past puts a person's schooling follows where they were born, not the opening town"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When a person has no recorded residence or birthplace, buildDeepPast in src/core2/deep-past.ts places every school cohort in the opening locality, so nearly everyone in a town went to school there (SG-P8-deep-past): in the Owings, Maryland year (seed 38e6252af62e) 93.8% of 1,815 elementary cohort records sat in the opening locality. In the 2019-2023 American Community Survey (table B05002) 57.6% of Americans live in the state they were born in, from 27.4% in Nevada to 77.1% in Louisiana among the states. Give each opening person a recorded birthplace generated with who exists and seeded from the world, so the place's share born there matches data/research/core/acs-2023-b05002-born-in-state.json, and date and place their school cohorts from it; people born elsewhere get a school in their birth state. Resolve the locality-proxy half of SG-P8-deep-past when it works.

**Rules.** One rule, all 56 places: the born-here share is a per-place table keyed by postal code, never a state named in logic. Estimate, never UNKNOWN: a person with no recorded birthplace starts from the place's measured share, marked ESTIMATED with the B05002 source.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, named in the PR), the share of school:cohort-estimate records placed in the opening locality lands within 5 points of the place's B05002 born-in-state share, printed by scripts/research/deep-past-year.ts with the record ids, and the tests in src/core2/deep-past.test.ts pass. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/deep-past.ts,src/core2/data/deep-past.json,data/research/core/acs-2023-b05002-born-in-state.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: do not extend buildDeepPast; fold into the simulated-history session (OD:14).

Superseded by #6640 (merged Oct 28, wire-opening-and-home line 7): `buildDeepPast` and `deep-past.json` are deleted; the school engine runs each child's school years a year at a step at the district of the place they lived that year (`src/core2/past-school.ts`, `school.started` records), so the school follows the birthplace and every move. Nothing left to build here.
