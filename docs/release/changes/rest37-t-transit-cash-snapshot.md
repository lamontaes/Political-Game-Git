---
id: rest37-t-transit-cash-snapshot
impact: minor
section: Added
title: Inspect recorded transit funding cash before requesting service
---

Expose a dated read-only cash snapshot through the supported transit office
projection, with exact staged contract costs and distinct missing-account,
missing-balance and recorded-cash states. Actual receipts determine cash;
appropriations and estimates do not create it. Inspection reserves nothing and
the existing payment writer rechecks authority and cash at settlement.
