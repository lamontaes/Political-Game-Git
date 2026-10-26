---
id: tests-recalls-counted-signers-worker-oom
impact: none
---

The recall tests that build and play whole worlds run with play's bookkeeping off, which they never read, so the file runs in about six minutes instead of ten and a half.
