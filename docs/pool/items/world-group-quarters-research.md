---
id: world-group-quarters-research
title: "Research: how many people live in group quarters in each of the 56 places, by type (college housing, prisons, military quarters, nursing homes)"
area: world
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The model has no group quarters: every resident is a household in the housing market. The Census counts group-quarters residents by place and by type (college or university student housing, correctional facilities, military quarters, nursing facilities and other institutional and noninstitutional quarters). In a college town like Storrs, Connecticut, students then seem to rent and are evicted in large numbers. This item gathers the sourced counts the build item reads, so group-quarters residents can be placed outside the rental market in every place.

**Rules.** Research before building and estimate, never UNKNOWN: each count is SOURCED from a fetched Census table (2020 Census, group quarters population by major type, at place level) with its citation, or ESTIMATED from a named source with its spread where a place or territory lacks the table. One rule, all 56 places: the data covers every locality the game can draw, keyed by place, never named in logic.

**Done when.** A data file under data/research/ holds, for every locality key the game can draw in all 56 places, its group-quarters population by type with the source table and vintage, SOURCED or ESTIMATED with a spread; a test reads it and checks Storrs, Connecticut (key 0973980) against the fetched Census row, and the researcher skill's report names the pages fetched.

**Files.** data/research/, src/core2/data/

**Notes.** Lead: speed (CTO, Nov 1). Feeds core-group-quarters-population.
