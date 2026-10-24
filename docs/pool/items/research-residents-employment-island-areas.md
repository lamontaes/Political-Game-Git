---
id: research-residents-employment-island-areas
title: "Research: island-area employment by age from the 2020 Decennial tables, with suppression and margin handling (SG-P8-resident-employment-proxy)"
area: people
kind: research
priority: 2
size: S
status: open
claimed-by:
pr: #5764
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Split from research-residents-sourced-parameters, whose county-employment part merged as PR 5690 but left SG-P8-resident-employment-proxy open. This item delivers the island-area slice: American Samoa, Guam, the Northern Marianas and the Virgin Islands get their own employment-by-age observations from the 2020 Island Areas Censuses (Demographic and Housing Characteristics, table PCT47), as SOURCED rows with a citation, in the existing research table `src/core2/data/resident-employment-counties.json` that `opening-employment.ts` already reads. The 2020 island-area counts are complete-count enumerations (swapped and partly synthesized, not sampled), so no sampling margin exists to record; the source's `limits` entry states that, and states that only island-wide rows are used because village, district and municipality rows can be suppressed. The county fallback (a county whose own ACS cell for an age is empty) is not part of this slice and remains open under SG-P8-resident-employment-proxy.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** (1) Each of the four island areas has a SOURCED row per age band in `src/core2/data/resident-employment-counties.json`, keyed by its state-equivalent code, with a `sources` entry naming publisher, year, URL, file and table, and a `limits` entry that states the no-sampling-margin and suppression handling; the spread shown is the table across the four islands. (2) The existing reader (`opening-employment.ts`, with `population.ts` passing the state-equivalent code for a place with no county of its own) uses those rows with basis `county-ACS`, and `src/core2/opening-employment-provenance.test.ts` requires it for every territory. (3) SG-P8-resident-employment-proxy in `src/core2/data/stopgaps.json` is narrowed, not closed: the island clause is removed and the row names PCT47 and the file, and it stays open for the county fallback (`national-CPS-age-with-tunable-missing-county-scale`). (4) `src/core2/island-employment.test.ts` plays a drawn island-area town (`buildBenchWorld`, seed named in the PR) for exactly 365 days and reports the employment-by-age bands and where the town landed. The county fallback remains open under SG-P8-resident-employment-proxy.

**Files.** src/core2/data/resident-employment-counties.json,src/core2/data/resident-employment.json,src/core2/data/stopgaps.json,src/core2/opening-employment.ts,src/core2/population.ts,src/core2/island-employment.test.ts,src/core2/opening-employment-provenance.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5764 (branch claude/island-employment): The shared county-table reader avoids duplicating a parameter layer, and narrowing the residual county fallback is appropriate. The research acceptance still needs an evidence mapping for its SOURCED/ESTIMATED rows, citation and spread, plus suppression/margin handling and the research record with a reader. The new county-count pairs and citations do not document those uncertainty/suppression requirements, and the body explicitly leaves the named proxy row open rather than explaining how its required island-area resolution is represented. Supply the required Done when table, explain any inapplicable Census sampling-margin requirement rather than inventing an interval, document suppressed-cell handling and the remaining county fallback, and show the acceptance with the actual data layout. Also the new played-year test asserts only core.date > gameStartDate after advancing; assert the actual 365-day target and report the named employment-band outcome. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5764 (branch claude/island-employment): the body spread row still states 59.8 and 66.9 percent, but its own counts give 59.6 and 67.3; the acceptance row requiring SG-P8-resident-employment-proxy resolved is explicitly Not resolved, so align the bounded island specification while retaining county fallback work; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5764 (branch claude/island-employment): percentages corrected, but the evidence still marks parameter layout and proxy resolution UNMET; provide a completed bounded island-only specification while keeping county fallback work open; finish on that branch, merge main into it first.
