---
id: dated-cash-allocation
impact: none
---

Dated-cash minima accumulate one checkpoint at a time instead of collecting
checkpoint and balance arrays. Live payment frontiers are not retained in the
historical-reading cache. Balance snapshots materialize evidence IDs when read,
preserving their original prefix and cutoff across later payments and branches.
Cash amounts, historical minima, unknown-cash handling and saved records do not
change. The original city-law case must establish whether its heap failure is
resolved.
