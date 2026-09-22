---
id: merge-train-and-decision-log-2026-09-22
impact: none
---

Internal records only — the night's merge-train write-up and three decision-log
entries (D-087, D-088, D-089) covering how failures were attributed, what an
instrument that measures nothing reports, and why a committed generated file
makes a branch un-mergeable. No shipped code, content or player-facing text
changes.

Declared because `release:check` counts every changed path outside
`docs/release/changes/` as eligible: a comparison range containing only
documentation and no declaration fails the `repository` gate. Documentation is
not exempt; it is `impact: none`.
