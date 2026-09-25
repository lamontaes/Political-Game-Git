---
id: day-clock-avoids-repeated-place-and-roll-scans
impact: patch
section: Fixed
title: Day advances avoid repeated place and congressional history scans
---

The Day clock and its screens now reuse county and territory identity indexes
instead of searching every place on repeated reads. Congressional seat reads
also search the existing history from the newest record without copying it.
Saved place and seat identities are unchanged.
