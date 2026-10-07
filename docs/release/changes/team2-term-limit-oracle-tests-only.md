---
id: team2-term-limit-oracle-tests-only
impact: patch
section: Changed
title: Keep legacy term-limit votes in parity tests only
---

Removes the retired term-limit ballot evaluator from production. Its unchanged
before-and-after oracle now lives in a test fixture; live member votes continue
through the shared chamber decision.
