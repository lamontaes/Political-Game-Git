---
id: day-clock-avoids-repeated-place-and-roll-scans
impact: patch
section: Fixed
title: Day advances avoid repeated work for distant people and jurisdictions
---

The Day clock and its screens now reuse county and territory identity indexes
instead of searching every place on repeated reads. Congressional party reads
index seat-roll history by person. State executive reads build their organization,
tenure, vacancy, and work lookups once per read rather than scanning each history
for every state. Saved place, seat, and office identities are unchanged. The
screen prepares appearance snapshots for people present in the current scene
instead of every distant legislator in the world; a person's saved appearance
remains available when they come into view.
