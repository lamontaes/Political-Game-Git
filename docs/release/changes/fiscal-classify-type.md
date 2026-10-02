---
title: Fix the type error in the fiscal authority classifier
impact: none
---
The highest enforced balanced-budget stage is read the same way, but now type-checks under the project's strict index rules, so the whole-app type check passes again.
