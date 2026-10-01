---
id: world-report-survives-big-saves
impact: patch
section: Fixed
title: The world report is written even when a run is too large to keep
---

A development tool fix. The world report serialized the whole finished world before writing its report, so a long run (four or more years) lost its report to the JavaScript string limit. The report is now always written. A new `--summary <path>` option writes the behavior checks (bills filed and enacted by year, states enacting, chambers that never pass, presidents, months without pay, rent or tax) straight from the finished world.
