---
id: tests-enact-law-ids-rerate-ended-job
impact: patch
section: Fixed
title: A minimum wage taking effect no longer stops the game over a job that ended before it began.
---

A commuter's job could end the day before it was to start while its schedule still ran to that start day, and the minimum wage tried to raise it and stopped the game. The wage now raises only jobs whose own record is still open.
