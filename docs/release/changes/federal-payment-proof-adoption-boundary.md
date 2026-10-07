---
id: federal-payment-proof-adoption-boundary
impact: patch
section: Fixed
title: Federal payment proof prepares its shared adopted authority before cash checks
---

The federal state-payment regression fixture prepares its existing shared
canonical adopted-law authority in the normal suite-setup hook. The first
cash test no longer includes all cold legislative and executive setup work.
The existing project hook limit and each case's original timeout remain intact.
Payment, budget credit, provenance and reload assertions are unchanged.
No payment writer, legal amount or adoption validation changes.
