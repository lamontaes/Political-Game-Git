---
id: team8-portrait-decode-recovery-proof
impact: patch
section: Fixed
title: Portrait decode recovery has focused regression coverage
---

Focused tests protect the already-landed portrait retry fix: failed image decodes may be retried, successful files stay cached, and another consumer can recover the same recipe. This change adds coverage only and makes no additional portrait behavior change.
