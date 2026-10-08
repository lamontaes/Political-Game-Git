---
id: typecheck-heap
impact: patch
section: Fixed
title: The type check no longer runs out of memory
---

The project type check now asks for 8 GB of heap, as the other heavy scripts do, so it reports type errors instead of crashing.
