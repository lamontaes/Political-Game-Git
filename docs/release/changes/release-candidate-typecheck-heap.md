---
id: release-candidate-typecheck-heap
impact: patch
section: Fixed
title: Release validation has room to check the full word pack
---

Release validation now gives its existing build and typecheck a 5 GB Node heap. The full word pack exceeded Node's default 4 GB heap, stopping candidate validation before an update could be published.
