---
id: pool-core-year-speed
impact: patch
section: Fixed
title: Avoid repeated home price calculations in town measurements
---

Town housing measurements calculate the common home-price change once per read and value only homes in the requested place.
