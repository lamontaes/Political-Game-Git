---
id: cleanup-move-tests
impact: none
---

Moved 1,916 tracked tests and browser checks into the mirrored tests tree with their assertions intact. Re-run scripts/move-tests after integrating other builders' changes. The current implementation keeps source-backed fixture lookups at their original locations and preserves discovery, exclusions, and typecheck coverage.
