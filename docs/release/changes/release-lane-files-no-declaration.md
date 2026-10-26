---
id: release-lane-files-no-declaration
impact: none
---

The release check and the release workflow now treat the play-first lane's progress log and lead sheets (`docs/play-first/PROGRESS.md`, `docs/coordination/LEADS-2026-10-24.md`, `docs/coordination/MERGE-FIRST.md`) like the pool: a commit touching only them needs no declaration and starts no release run. Nothing in the client changes.
