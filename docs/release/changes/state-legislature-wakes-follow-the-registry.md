---
id: state-legislature-wakes-follow-the-registry
impact: patch
section: Changed
title: State legislature wakes are scheduled only where the clock can run them
---

Advancing time reconciles the state legislature wake queue only when the clock's handlers include the wake, so narrower test clocks no longer meet work they cannot run. Ordinary play is unchanged.
