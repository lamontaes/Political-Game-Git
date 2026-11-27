---
id: game-only-tests-out-of-src
impact: none
---

Move every test file, and the helpers that only tests use, out of the game's source folders into a tests/src mirror by a re-runnable script (scripts/move-tests); a guard keeps tests out of src, public and art. The game plays the same.
check-changes: this change loosens no check.
