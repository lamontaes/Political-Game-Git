---
id: report-check-runs-on-pinned-node
impact: none
---

The report check that measures every write-up for the owner imported its
British-vocabulary list from a TypeScript file. Node 22.13, the version CI and
the desktop package pin, cannot load a `.ts` file from plain JavaScript, so the
hook crashed with exit 1 before checking anything, and three of its own tests
failed on every CI run. The list now lives in a plain JavaScript module that
both the hook and the authored-copy checks read. Nothing changes for a player.
