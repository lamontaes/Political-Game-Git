---
id: browser-suite-measured-timeout
impact: none
---

The browser suite's cases inherited Playwright's thirty-second default, which is
below what an ordinary walk in this game costs, so sixty of them were killed
part-way and reported as timeouts. The budget is now two minutes, sized from the
slowest legitimate case measured. Test-only; no player-facing change.
