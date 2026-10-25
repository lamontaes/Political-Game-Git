---
id: release-package-build-heap
impact: patch
section: Fixed
title: Desktop packaging has room to build the full word pack
---

The desktop package build now gives its typecheck the same 5 GB Node heap as release validation. With 4 GB it ran out of memory on macOS and Windows, so no desktop update could be published.
