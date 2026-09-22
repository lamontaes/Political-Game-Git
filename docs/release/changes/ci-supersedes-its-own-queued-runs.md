---
id: ci-supersedes-its-own-queued-runs
impact: none
---

Build infrastructure: a new commit now cancels its own predecessor's CI run on
a pull-request branch, and deliberately does not on main. Nothing in the game
changes.
