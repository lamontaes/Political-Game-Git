---
id: test-imports-heap
impact: patch
section: Fixed
title: The test import check has the same memory as the type check
---

The check that test files import real modules ran out of memory at Node's
default 4 GB and stopped the build. It now asks for 8 GB, as the type check does.
