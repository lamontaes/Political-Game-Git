---
id: split-unit-and-browser-runs
impact: none
---

Build infrastructure only — the browser proofs move from the deterministic
validation workflow into their own, so a unit verdict stops queueing behind the
browser shards. No shipped code, content or player-facing text changes, and no
test is skipped, retimed or removed.
