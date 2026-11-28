---
id: elections-candidates-read
impact: none
---

Structure only: the read of who decided to run in a contest joins the elections engine's ring-free reads file, so a reader in another engine takes it without loading the candidacy engine; the candidacy engine re-exports it. No behavior changes.
