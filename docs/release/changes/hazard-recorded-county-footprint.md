---
id: hazard-recorded-county-footprint
impact: patch
section: Fixed
title: Hazard counts and footprints follow recorded reports
---

A hazard now reaches represented places in its recorded county footprint through Census geography. Counts replay a complete episode-detail year from the source catalog rather than drawing a Poisson count from aggregate rates. The calendar cycles through the catalog's complete detail years; this is historical report replay, not a forecast. Alphabetical order no longer picks the affected places, and forecast zones are not treated as counties.
