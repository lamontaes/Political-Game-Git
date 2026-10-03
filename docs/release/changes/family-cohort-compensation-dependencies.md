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

When a cohort rebuild is needed, repeated reads of one person's household
context are shared only within that build. Existing sample and membership
order, household representatives and dated dependency checks are preserved.

Family pay proxies reuse the existing parent-first household selection to read
donor members without computing unused pay, work or congregation context.
Recorded parents, membership order, dated residence and cohort inputs remain
unchanged; this introduces no retained cache or new family facts.
