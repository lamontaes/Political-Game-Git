---
id: legislative-clock-history-lookups
impact: patch
section: Fixed
title: Reuse unchanged history when the legislative clock runs
---

Legislative actions now check occupied operation keys without rebuilding every
prefix in the saved history. Unchanged legislative record families retain their
existing lookup indexes. The clock still records every action and applies the
same deadlines.

Legislative clock passes reuse their unchanged chamber roster and skip building
vote questions when no motion is pending. These reads preserve historical
cutoffs, saved outcomes and older snapshots.

Local council reads reuse the same history indexes for organization identity,
participations and seat status. Resignations still remove members immediately,
and reading a later roster does not change an earlier saved snapshot.
