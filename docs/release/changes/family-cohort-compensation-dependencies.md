---
id: family-cohort-compensation-dependencies
impact: patch
section: Fixed
title: Family readings reuse unchanged recorded pay dependencies
---

Family-context cohorts retain their existing records and estimates when new
withholding flows do not change recorded compensation. Compensation changes,
revised histories, household and work changes still invalidate the reading.
Future dated records and the existing year boundary retain their rebuild rules.
