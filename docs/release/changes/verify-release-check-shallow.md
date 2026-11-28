---
id: verify-release-check-shallow
impact: none
---

The verify skill says what to do when `release:check` stops in a shallow cloud clone: fetch the full history without file contents (`git fetch --unshallow --filter=blob:none origin main`), then the check passes.
