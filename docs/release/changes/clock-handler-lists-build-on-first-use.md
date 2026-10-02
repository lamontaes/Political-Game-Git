---
id: clock-handler-lists-build-on-first-use
impact: none
---

Tests that loaded the game clock could crash before running a single check, and the game's modules could not be loaded under plain Node, because the clock's handler lists were built while the code was still loading; they now build on first use.
