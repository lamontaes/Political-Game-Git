---
id: a102-actual-judge-facts
impact: patch
section: Fixed
title: Eviction judgments require actual seated judge facts
---

Missing seated judges now leave eviction case facts unsupported before a court name is constructed. The existing judgment writer keeps the filing pending. Saved judgments name the actual judge; they no longer receive a generic court actor. The focused civil-actor fixtures reuse the shared court finder and retain vacancy, reappointment, provenance, counsel, repeat and reload checks.
