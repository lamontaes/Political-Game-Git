---
id: final-rent-cap-bypass
impact: patch
section: Fixed
title: Final rent terms receive the market renewal proposal
---

Lease renewals with a supported final cap now send the market proposal to the
existing price consumer without first applying the blanket inflation cap.
Unsupported numeric terms retain the existing fallback.
