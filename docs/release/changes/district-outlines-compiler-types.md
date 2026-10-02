---
id: district-outlines-compiler-types
title: Keep district-outline compiler geometry types explicit
impact: none
section: Fixed
---

The offline district-outline compiler now declares the coordinate-array contract at its existing CommonJS clipping boundary. The shoreline operations, source locks, district assignments and drawing algorithms are unchanged. The existing nesting test's polygon-length callback has an explicit erased parameter type.
