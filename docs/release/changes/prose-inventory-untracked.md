---
id: prose-inventory-untracked
impact: patch
section: Changed
title: Generated reports are no longer kept in the repository
---

Nothing changes in play. Behind the scenes, three files the tooling writes for itself are no longer kept in the repository, because the tooling rebuilds them from the source every time anyone asks: a prose coverage report, its readme, and a census of hardcoded content. They were mostly lists that changed whenever anybody added a file, so two pieces of work being brought together would collide on them even when neither had touched the same thing. The check the coverage report existed for is kept: the five numbers it actually reads are now written to a small file of their own, so adding prose without rebuilding still fails the build. The census guarded nothing — its checks rebuild it before reading it — and was verified to pass with no file present at all.
