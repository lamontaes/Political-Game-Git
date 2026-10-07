---
id: slow-tests-batch-integrity
impact: patch
section: Fixed
title: Two slow checks finish in a fraction of the time
---

Two internal checks that build a whole nationwide world now check the world once per batch of writes, and the opening-life checks have a time limit that matches how long a nationwide world really takes. Nothing changes in play.
