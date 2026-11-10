---
id: world-group-quarters-ages-research
title: "Research: ages and sex of each group-quarters type, and each county's institutional residents by age"
area: world
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: money
source: stand-in triage Nov 10, 2026; stopgaps SG-GQ-ages-by-type, SG-GQ-county-employment-denominator
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The opening houses each place's college, prison, nursing-home, juvenile and military residents with ages and sex drawn from shares the game's authors set by eye. The Census publishes the real ages and sex of each type, so the shares can be replaced by sourced numbers. The same table, read by county, also tells how many of a county's adults live in institutions, which the opening's employment target now ignores.

**Cause.** Found in code: src/core2/population.ts (the stopgap("SG-GQ-ages-by-type") call near line 882, groupQuartersProfileOf) reads TUNABLE age bands from src/core2/data/people/group-quarters.json; src/core2/opening-employment.ts line 430 (SG-GQ-county-employment-denominator) divides by civilians including institutional residents.

**Fix.** Fetch the 2020 Census Demographic and Housing Characteristics tables PCO3 to PCO10 (group quarters by sex and age, each major type, national; and by county for institutional types). Quote the pages in data/research/group-quarters/README.md. Replace the age bands and female shares in src/core2/data/people/group-quarters.json with the national numbers, tagged SOURCED with the citation and table cell ids, keep the largest-remainder split unchanged, and where the county table is available subtract each county's institutional residents by age from the denominator in opening-employment.ts. Resolve both stand-ins in src/core2/data/stopgaps/gq.json.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Research before building: the real numbers calibrate who lives where and never decide one person's outcome. One rule, all 56 places: the national profile applies to every place, and no place is named in logic. Estimate, never UNKNOWN: a type with no published row keeps a marked estimate with its source.

**Done when.** A second session, in a played world at three drawn places (places and seeds named), sees each type's residents' ages and female share match the cited table within rounding, by room record id with the counts printed, and sees a prison county's opening employment target reflect its institutional residents; the two stand-ins read resolved.

**Waits on.** Nothing.

**Files.** src/core2/data/people/group-quarters.json, src/core2/population.ts, src/core2/opening-employment.ts, src/core2/data/stopgaps/gq.json, data/research/group-quarters/README.md
