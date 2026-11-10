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
after:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** Relatives outside the town carry only a county or state, so how often a person sees one depends only on whether they live in the household's county (the full pull) or anywhere else (0.39 of it, farKinContactShare, from Pew 2006), the stopgap SG-P15-distance-by-place. Give each relative outside the town a place from the opening's records, compute the distance between the two places from the Census Gazetteer interior points the repository already holds (data/source/places/corpus.json and data/source/counties/corpus.json), and let the visit rate in src/core2/closeness.ts and the tie-fading reason in src/core2/modules/people.ts fall with travel time. The decay curve still needs a source: data/research/core/pew-2006-family-contact.json holds contact with a parent in town against out of town and where parents live (in the household 14 percent, the same town 27, under an hour 24, under four hours 12, farther 23), but no U.S. table of contact by travel time was found on Oct 23, 2026, so a researcher finds one (GSS, HRS or PSID) before the curve is set.

**Cause.** Found in code: src/core2/closeness.ts line 202 and src/core2/modules/people.ts line 79 use `farKinContactShare` (0.39, from Pew 2006) for any relative outside the household's county; stopgap SG-P15-distance-by-place (src/core2/data/stopgaps/p15.json line 75).

**Fix.** Compute travel time between two places from the Census Gazetteer files (data/source/places/corpus.json and data/source/counties/corpus.json) and let visit rate and tie fading fall with it, using a sourced curve.

**Time box.** 6 hours for an Opus session once the curve is sourced.

**Rules.** Wire to the world: the distance must change how often a person actually visits a relative in a played world, read by the closeness engine at the moment it decides. One rule, all 56 places: distances come from the Gazetteer data for every place, never a named place.

**Done when.** A second session, in a one-year buildBenchWorld run of a drawn place (place and seed named in the PR), sees a relative living in a near county visited more often than one several hours away, by visit record ids. `farKinContactShare` is retired or SOURCED, and SG-P15-distance-by-place is resolved in src/core2/data/stopgaps/p15.json.

**Waits on.** Nothing. No item holds the sourced table of family contact by travel time (none was found on Oct 23): looking again is this item's first step (researcher skill). If no source exists, keep `farKinContactShare`, build the travel time between places, and leave the curve as a registered stopgap marked ESTIMATED with what it was fitted to.

**Files.** src/core2/closeness.ts, src/core2/modules/people.ts, src/core2/data/parameters.json, data/research/core/pew-2006-family-contact.json, src/core2/data/stopgaps/p15.json

**Notes.** TODO
