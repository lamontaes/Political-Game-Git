---
id: history-index-weak-tail
impact: none
---

The existing growing history index keeps weak references to old array tails.
Indexed answers, append order, prefix guards and old-snapshot reads remain
unchanged; an expired reference uses the existing rebuild fallback. This
internal retention repair does not establish the cause of prior heap failures.
