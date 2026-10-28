---
id: remove-stray-root-files
impact: none
---

Three empty files at the repository root, whose names are not valid on Windows and broke the Windows package checkout, are deleted; no code or data reads them.
