---
id: canonical-government-unit-lookup
impact: patch
section: Fixed
title: Council callers share the canonical government lookup
---

The government-unit reader resolves existing municipio identities through the
same lookup as other catalog governments. Council callers reuse that reader
instead of maintaining a separate fallback.
