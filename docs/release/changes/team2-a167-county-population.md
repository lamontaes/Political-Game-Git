---
id: team2-a167-county-population
impact: patch
section: Fixed
title: Count multi-county city residents in their own counties
---

City outcome weights now deduct residents from each county using the Census
population parts rather than assigning the whole city to its largest county.
The weights use the published 2020 boundaries and population proportions.
