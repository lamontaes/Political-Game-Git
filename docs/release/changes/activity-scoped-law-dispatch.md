---
id: activity-scoped-law-dispatch
impact: patch
section: Fixed
title: Law consequence dispatch retains canonical registrations
---

Law consequence dispatch validates the catalog rows for the requested activity,
so unrelated tax assessment rows do not block coverage renewals. Optional caller
registrations retain canonical handlers; conflicting owners and unsupported
requested kinds, selectors, and actions still fail validation.
