---
id: prose-inventory-untracked
impact: patch
section: Changed
title: The generated coverage report is no longer committed
---

Nothing changes in play. Behind the scenes, two files the prose tooling writes for itself — a coverage report and a readme — are no longer kept in the repository, because the tooling rebuilds them from the source every time anyone asks. They were mostly lists of which files hold text that still needs a person's judgement, so they changed whenever anybody added a file, and two pieces of work being brought together would collide on them even when neither had touched the same prose. The check they existed for is kept: the five numbers it actually reads are now written to a small file of their own, so adding prose without rebuilding still fails the build.
