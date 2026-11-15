---
id: release-repository-job-changed-files-on-one-command-line
impact: none
---

Pool item only: the repository job's prettier and eslint steps give every changed file to one command line, which fails once a diff is as large as the Train; the item holds the batched form.
