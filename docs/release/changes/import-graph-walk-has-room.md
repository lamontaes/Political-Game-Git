---
id: import-graph-walk-has-room
impact: none
---

The test that walks every module below `world.ts` for bare JSON imports now has
the same thirty seconds as its sibling walk over the browser specs. It had been
timing out at the default five seconds on busy runners. Nothing in play changes.
