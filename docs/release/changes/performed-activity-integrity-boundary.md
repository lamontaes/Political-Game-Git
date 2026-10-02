---
id: performed-activity-integrity-boundary
impact: patch
section: Improved
title: Validate completed activities at the clock boundary
---

Performing a scheduled activity keeps the full final world validation while
avoiding repeated whole-world checks between its recorded updates.
