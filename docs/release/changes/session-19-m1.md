---
id: session-19-m1
impact: patch
section: Improved
title: Add a seeded watched-world year speed benchmark
---

Adds a reproducible 365-day watched-world timing command. It reports the
highest sampled costs from a 30-day profiled window and exits unsuccessfully
when the full run exceeds its time budget.
