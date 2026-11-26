---
id: history-engines-guard
impact: none
---

The one-history guard now counts the engines too: each file in src/core2/modules that reads a past of its own, outside the one history reader, with its count. A count only goes down. Nothing a player reads changes.
