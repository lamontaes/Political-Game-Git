---
id: saved-typed-tax-assessment
impact: patch
section: Fixed
title: Enacted typed taxes collect without a catalog question
---

Declaring a taxable occurrence under an already enacted typed levy again records
its assessment and scheduled collection. The shared handler uses the saved levy,
policy and enactment without inventing a catalog question. Repeating the activity
does not assess it twice; catalog-bound levies retain their adopted-term checks.
