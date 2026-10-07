---
id: history-index-weak-tail
impact: none
---

The growing history index reuses the existing append-aware index helper and
its bounded recent-array retention instead of weak references to old tails.
Indexed answers, append order, prefix guards and old-snapshot reads remain
unchanged; a cache miss uses the existing rebuild fallback. This internal
retention repair does not establish that prior heap failures are resolved.
