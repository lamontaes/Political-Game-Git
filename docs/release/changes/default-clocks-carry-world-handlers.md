---
impact: player-visible
section: Fixed
title: Default clock advances carry scheduled consequences
---

Day and minute advances now use the existing complete world handler registry by default. Registry initialization keeps the same validation and routine composition cache in modules that can load before the clock.
