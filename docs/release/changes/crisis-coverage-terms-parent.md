---
id: crisis-coverage-terms-parent
impact: patch
section: Fixed
title: Coverage records retain their saved lease-renewal cause
---

Crisis validation recognizes existing resource-flow terms when checking a coverage record's causal parent. Missing parents and parents at or after the coverage record's sequence remain invalid. Lease renewal and coverage records are preserved through saved-world reload.
