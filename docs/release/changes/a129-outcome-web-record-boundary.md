---
id: a129-outcome-web-record-boundary
impact: patch
section: Fixed
title: Law projections share the live outcome web
---

Law effect paths now read their projection rows through the same outcome web used by live outcomes. Saved cause and effect records retain their writers and integrity checks in a separate storage module; the compatibility evaluator remains available for explicit legacy records.
