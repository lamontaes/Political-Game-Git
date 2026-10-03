---
id: kinship-person-history-index
impact: patch
section: Fixed
title: Kinship readings reuse the existing person history index
---

Kinship queries group recorded relationships by their member IDs through the
existing append-aware history reader. Relationship order, dated and sequence
cutoffs, and earlier saved snapshots retain their existing behavior.
