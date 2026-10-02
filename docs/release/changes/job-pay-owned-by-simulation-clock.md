---
id: job-pay-owned-by-simulation-clock
impact: patch
section: Fixed
title: Job pay follows the simulation clock
---

The simulation settles the played character's recorded job pay when the date
changes. Ordinary-life presentation no longer settles that pay a second time.
An older job without a pay flow starts paying when it is first discovered,
without backpay for time before that discovery.
