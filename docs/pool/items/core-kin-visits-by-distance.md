---
id: core-kin-visits-by-distance
title: "Visits to relatives fall with travel time between their places"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Relatives outside the town carry only a county or state, so how often a person sees one depends only on whether they live in the household's county (the full pull) or anywhere else (0.39 of it, farKinContactShare, from Pew 2006), the stopgap SG-P15-distance-by-place. Give each relative outside the town a place from the opening's records, compute the distance between the two places from the Census Gazetteer interior points the repository already holds (data/source/places/corpus.json and data/source/counties/corpus.json), and let the visit rate in src/core2/closeness.ts and the tie-fading reason in src/core2/modules/people.ts fall with travel time. The decay curve still needs a source: data/research/core/pew-2006-family-contact.json holds contact with a parent in town against out of town and where parents live (in the household 14 percent, the same town 27, under an hour 24, under four hours 12, farther 23), but no U.S. table of contact by travel time was found on Oct 23, 2026, so a researcher finds one (GSS, HRS or PSID) before the curve is set.

**Rules.** Wire to the world: the distance must change how often a person actually visits a relative in a played world, read by the closeness engine at the moment it decides. One rule, all 56 places: distances come from the Gazetteer data for every place, never a named place.

**Done when.** In a one-year buildBenchWorld run of a drawn place (seed named in the PR), a relative living in a near county is visited more often than one several hours away, shown by visit record ids, farKinContactShare is retired or SOURCED, and SG-P15-distance-by-place is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/closeness.ts, src/core2/modules/people.ts, src/core2/data/parameters.json, data/research/core/pew-2006-family-contact.json

**Notes.** TODO
