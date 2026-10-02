---
id: team2-a53-opening-owner-records
impact: patch
section: Fixed
title: Opening mortgage estimates distinguish recorded and estimated home tenure
---

Opening mortgage preparation reads the owner's saved primary residence date.
When that date is missing, it can use the recorded average among similar owners
in the same town and retains the records supporting the estimate. An empty
observed cohort does not supply fictional years of prior payments.
