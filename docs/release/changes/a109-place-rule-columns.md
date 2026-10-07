---
id: a109-place-rule-columns
impact: patch
section: Fixed
title: Electoral allocation reads each place's recorded allocation method.
---

National election rules now read allocation method and jurisdiction kind from the existing place reference. District splits, electoral totals, and contingent-election state membership remain unchanged.

The current presidential count keeps its recorded national-mood inputs and does not restore the former regional residual. Canonical identity data also retains the existing legacy state aliases without changing saved IDs.
