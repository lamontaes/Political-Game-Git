---
id: legislative-clock-history-lookups
impact: patch
section: Fixed
title: Reuse unchanged history when the legislative clock runs
---

Legislative actions now check occupied operation keys without rebuilding every
prefix in the saved history. Unchanged legislative record families retain their
existing lookup indexes. Due-item and political writers transfer disposable
indexes along their own append operations while keeping older World snapshots
independent. The clock still records every action and applies the same deadlines.
